import { Injectable, Logger } from "@nestjs/common";
import { tool } from "langchain";
import { z } from "zod";

type JsonSchema = {
  type?: string | string[];
  description?: string;
  enum?: unknown[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  default?: unknown;
};

type McpToolDefinition = {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
};

type McpJsonRpcResponse<T> = {
  jsonrpc?: "2.0";
  id?: number;
  result?: T;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
};

@Injectable()
export class McpClientService {
  private readonly logger = new Logger(McpClientService.name);
  private readonly url = process.env.MCP_URL;
  private readonly apiKey = process.env.MCP_API_KEY;
  private readonly timeoutMs = Number(process.env.MCP_TIMEOUT_MS ?? 60000);
  private toolDefinitionsPromise?: Promise<McpToolDefinition[]>;
  private requestId = 1;

  isConfigured() {
    return Boolean(this.url && this.apiKey);
  }

  getEndpoint() {
    return this.url;
  }

  async getToolPromptSection() {
    const tools = await this.getToolDefinitions();
    if (tools.length === 0) return "";

    const toolLines = tools.map((definition) => {
      const description = this.compactDescription(definition.description);
      return `- ${definition.name}${description ? `：${description}` : ""}`;
    });

    return `\n\n## MCP 业务工具\n\n当用户询问生产、质量、设备、工艺、工单、配方、物料、报警、SPC、OEE、产量、追溯、数据库表数据等业务问题时，优先使用 MCP 业务工具查询真实数据，不要只凭常识回答。\n\n当前已接入的 MCP 工具：\n${toolLines.join("\n")}`;
  }

  async createLangChainTools() {
    if (!this.isConfigured()) {
      this.logger.log("MCP_URL or MCP_API_KEY is not configured. Skip MCP tools.");
      return [];
    }

    const tools = await this.getToolDefinitions();
    this.logger.log(
      `Loaded ${tools.length} MCP tools from ${this.url}: ${tools
        .map((item) => item.name)
        .join(", ")}`,
    );

    return tools.map((definition) =>
      tool(
        async (input: Record<string, unknown>) => {
          const result = await this.callTool(definition.name, input ?? {});
          return this.renderToolResult(result);
        },
        {
          name: definition.name,
          description: definition.description || `MCP tool: ${definition.name}`,
          schema: this.toZodObject(definition.inputSchema),
        },
      ),
    );
  }

  private getToolDefinitions() {
    this.toolDefinitionsPromise ??= this.listTools();
    return this.toolDefinitionsPromise;
  }

  private async listTools() {
    const result = await this.request<{ tools?: McpToolDefinition[] }>(
      "tools/list",
      {},
    );
    return result.tools ?? [];
  }

  private async callTool(name: string, args: Record<string, unknown>) {
    return await this.request("tools/call", {
      name,
      arguments: args,
    });
  }

  private async request<T>(method: string, params: unknown): Promise<T> {
    const response = await this.withTimeout(
      fetch(this.url!, {
        method: "POST",
        headers: {
          "X-Api-Key": this.apiKey!,
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: this.requestId++,
          method,
          params,
        }),
      }),
      this.timeoutMs,
    );

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`MCP ${method} failed: ${response.status} ${text}`);
    }

    const payload = this.parseMcpResponse<T>(text);
    if (payload.error) {
      throw new Error(payload.error.message || `MCP ${method} returned error`);
    }
    if (payload.result === undefined) {
      throw new Error(`MCP ${method} returned empty result`);
    }

    return payload.result;
  }

  private parseMcpResponse<T>(text: string): McpJsonRpcResponse<T> {
    const dataLines = text
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.replace(/^data:\s?/, "").trim())
      .filter(Boolean);

    const payloadText = dataLines.length > 0 ? dataLines.at(-1)! : text.trim();
    return JSON.parse(payloadText) as McpJsonRpcResponse<T>;
  }

  private toZodObject(schema?: JsonSchema) {
    const properties = schema?.properties ?? {};
    const required = new Set(schema?.required ?? []);
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const [key, propertySchema] of Object.entries(properties)) {
      const property = this.toZodType(propertySchema);
      shape[key] = required.has(key) ? property : property.optional();
    }

    return z.object(shape);
  }

  private toZodType(schema?: JsonSchema): z.ZodTypeAny {
    if (!schema) return z.any();

    const type = Array.isArray(schema.type)
      ? schema.type.find((item) => item !== "null")
      : schema.type;

    let result: z.ZodTypeAny;
    if (schema.enum?.length) {
      result = z.enum(schema.enum.map(String) as [string, ...string[]]);
    } else if (type === "integer") {
      result = z.number().int();
    } else if (type === "number") {
      result = z.number();
    } else if (type === "boolean") {
      result = z.boolean();
    } else if (type === "array") {
      result = z.array(this.toZodType(schema.items));
    } else if (type === "object" || schema.properties) {
      result = this.toZodObject(schema);
    } else {
      result = z.string();
    }

    return schema.description ? result.describe(schema.description) : result;
  }

  private compactDescription(value?: string) {
    if (!value) return "";
    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized.length > 140
      ? `${normalized.slice(0, 139)}...`
      : normalized;
  }

  private renderToolResult(result: unknown) {
    if (typeof result === "string") return result;

    if (result && typeof result === "object") {
      const content = (result as { content?: unknown }).content;
      if (Array.isArray(content)) {
        const text = content
          .map((item) => {
            if (typeof item === "string") return item;
            if (
              item &&
              typeof item === "object" &&
              typeof (item as { text?: unknown }).text === "string"
            ) {
              return (item as { text: string }).text;
            }
            return "";
          })
          .filter(Boolean)
          .join("\n");

        if (text) return text;
      }
    }

    return JSON.stringify(result);
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`MCP 请求超时，超过 ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
