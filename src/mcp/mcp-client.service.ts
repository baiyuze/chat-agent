import { Injectable, Logger } from "@nestjs/common";
import { tool } from "langchain";
import { loadPrompt } from "../common/prompt-loader";
import { renderMcpToolLines } from "./mcp-tool-list.util";
import { parseMcpResponse, renderToolResult } from "./mcp-response.util";
import { toZodObject } from "./mcp-schema.util";
import { McpToolDefinition } from "./mcp.types";

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
    if (!this.isConfigured()) return "";

    const tools = await this.getToolDefinitions();
    if (tools.length === 0) return "";

    return (
      "\n\n" +
      loadPrompt("mcp-business-tools.md") +
      "\n\n当前已接入的 MCP 工具：\n" +
      renderMcpToolLines(tools)
    );
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
          return renderToolResult(result);
        },
        {
          name: definition.name,
          description: definition.description || `MCP tool: ${definition.name}`,
          schema: toZodObject(definition.inputSchema),
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

    const payload = parseMcpResponse<T>(text);

    if (payload.error) {
      throw new Error(payload.error.message || `MCP ${method} returned error`);
    }
    if (payload.result === undefined) {
      throw new Error(`MCP ${method} returned empty result`);
    }

    return payload.result;
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
