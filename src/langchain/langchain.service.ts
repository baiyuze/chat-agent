import { Injectable, Logger } from "@nestjs/common";
import { ChatOpenAI } from "@langchain/openai";
import { TavilySearch } from "@langchain/tavily";
import { tool } from "langchain";
import { createDeepAgent } from "deepagents";
import { z } from "zod";
import { ChatMessage } from "../chat/chat.types";
import { McpClientService } from "../mcp/mcp-client.service";

export type LangChainStreamEvent =
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "activity";
      status: "running" | "complete";
      title: string;
      detail?: string;
    };

const today = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "long",
  timeZone: process.env.TZ ?? "Asia/Shanghai",
}).format(new Date());

const researchInstructions = `今天是 ${today}。当用户说“今天”“最新”“最近”时，以这个日期作为当前日期。

您是一位专家研究员。您的工作是进行彻底的研究，然后给出清晰、可执行、引用来源的中文回答。

您可以使用互联网搜索工具作为收集信息的主要手段。

## \`互联网搜索\`

使用它来运行给定查询的互联网搜索。您可以指定要返回的最大结果数、主题以及是否应包含原始内容。`;

@Injectable()
export class LangChainService {
  private readonly logger = new Logger(LangChainService.name);
  private readonly chatTimeoutMs = Number(process.env.CHAT_TIMEOUT_MS ?? 60000);
  private agentPromise?: Promise<ReturnType<typeof createDeepAgent>>;

  constructor(private readonly mcpClientService: McpClientService) {}
  
  async chat(messages: ChatMessage[]): Promise<string> {
    const agent = await this.getAgent();
    const result = await this.withTimeout(
      agent.invoke({ messages }),
      this.chatTimeoutMs,
    );

    return this.getLatestAssistantText(result);
  }

  async *streamChat(
    messages: ChatMessage[],
  ): AsyncGenerator<LangChainStreamEvent> {
    if (this.mcpClientService.isConfigured()) {
      yield {
        type: "activity",
        status: "running",
        title: "读取 MCP 工具",
        detail: this.mcpClientService.getEndpoint(),
      };
    }

    const agent = await this.getAgent();
    const events = agent.streamEvents(
      { messages },
      {
        version: "v2",
      },
    );

    for await (const event of events) {
      if (event.event === "on_chat_model_start") {
        yield {
          type: "activity",
          status: "running",
          title: "模型请求",
          detail: "正在整理上下文并生成回答",
        };
        continue;
      }

      if (event.event === "on_tool_start") {
        const name = event.name || "tool";
        const input = this.compactJson((event.data as { input?: unknown }).input);
        this.logger.log({ tool: name, input }, "ToolStart");
        yield {
          type: "activity",
          status: "running",
          title: `调用工具：${name}`,
          detail: input,
        };
        continue;
      }

      if (event.event === "on_tool_end") {
        const name = event.name || "tool";
        const output = this.summarizeToolOutput(
          (event.data as { output?: unknown }).output,
        );
        this.logger.log({ tool: name, output }, "ToolEnd");
        yield {
          type: "activity",
          status: "complete",
          title: `工具返回：${name}`,
          detail: output,
        };
        continue;
      }

      if (event.event !== "on_chat_model_stream") continue;

      const chunk = (event.data as { chunk?: unknown } | undefined)?.chunk;
      const text = this.extractText(chunk);
      if (text) yield { type: "delta", text };
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    let timer: NodeJS.Timeout | undefined;

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`LangChain 服务响应超时，超过 ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private getAgent() {
    this.agentPromise ??= this.createAgent();
    return this.agentPromise;
  }

  private async createAgent() {
    const [mcpTools, mcpToolPromptSection] = await Promise.all([
      this.mcpClientService.createLangChainTools(),
      this.mcpClientService.getToolPromptSection(),
    ]);

    return createDeepAgent({
      model: this.createModel(),
      tools: [this.createInternetSearchTool(), ...mcpTools],
      systemPrompt: `${researchInstructions}${mcpToolPromptSection}`,
    });
  }

  private createModel() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required. Set it in .env.");
    }

    return new ChatOpenAI({
      modelName: process.env.MODEL_NAME ?? "mimo-v2.5-pro",
      apiKey,
      configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
        defaultHeaders: {
          "Content-Type": "application/json",
        },
      },
      temperature: 0.7,
    });
  }

  private createInternetSearchTool() {
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (!tavilyApiKey) {
      throw new Error("TAVILY_API_KEY is required. Set it in .env.");
    }

    return tool(
      async ({
        query,
        maxResults = 5,
        topic = "general",
        includeRawContent = false,
      }: {
        query: string;
        maxResults?: number;
        topic?: "general" | "news" | "finance";
        includeRawContent?: boolean;
      }) => {
        const tavilySearch = new TavilySearch({
          maxResults,
          tavilyApiKey,
          includeRawContent,
          topic,
        });

        return await tavilySearch._call({ query });
      },
      {
        name: "internet_search",
        description: "Run a web search",
        schema: z.object({
          query: z.string().describe("The search query"),
          maxResults: z
            .number()
            .optional()
            .default(5)
            .describe("Maximum number of results to return"),
          topic: z
            .enum(["general", "news", "finance"])
            .optional()
            .default("general")
            .describe("Search topic category"),
          includeRawContent: z
            .boolean()
            .optional()
            .default(false)
            .describe("Whether to include raw content"),
        }),
      },
    );
  }

  private extractText(value: unknown): string {
    if (typeof value === "string") return value;
    if (!value || typeof value !== "object") return "";

    const record = value as Record<string, unknown>;
    if (typeof record.content === "string") return record.content;
    if (
      record.kwargs &&
      typeof record.kwargs === "object" &&
      typeof (record.kwargs as Record<string, unknown>).content === "string"
    ) {
      return (record.kwargs as { content: string }).content;
    }
    if (Array.isArray(record.content)) {
      return record.content
        .map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part === "object" && "text" in part) {
            return String((part as { text: unknown }).text ?? "");
          }
          return "";
        })
        .join("");
    }

    return "";
  }

  private compactJson(value: unknown) {
    const text =
      typeof value === "string"
        ? value
        : JSON.stringify(value, (_key, nestedValue) => {
            if (typeof nestedValue === "string" && nestedValue.length > 1200) {
              return `${nestedValue.slice(0, 1200)}...`;
            }
            return nestedValue;
          });

    if (!text) return undefined;
    return text.length > 1800 ? `${text.slice(0, 1800)}...` : text;
  }

  private summarizeToolOutput(value: unknown) {
    const content = this.extractText(value);
    if (!content) return this.compactJson(value);

    try {
      const parsed = JSON.parse(content) as {
        query?: string;
        results?: Array<{
          title?: string;
          url?: string;
          published_date?: string;
          score?: number;
        }>;
      };
      const lines = [
        parsed.query ? `query: ${parsed.query}` : undefined,
        ...(parsed.results ?? []).slice(0, 5).map((result, index) => {
          const parts = [
            `${index + 1}. ${result.title ?? "Untitled"}`,
            result.published_date ? `date: ${result.published_date}` : undefined,
            result.url,
          ].filter(Boolean);
          return parts.join(" | ");
        }),
      ].filter(Boolean);

      return lines.join("\n");
    } catch {
      return this.compactJson(content);
    }
  }

  private getLatestAssistantText(
    result: unknown,
    fallback = "没有生成可显示的回答。",
  ): string {
    const resultRecord = result as {
      messages?: unknown[];
      model_request?: { messages?: unknown[] };
    };
    const messages =
      resultRecord.messages ?? resultRecord.model_request?.messages ?? [];

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const text = this.extractText(messages[index]).trim();
      if (text) return text;
    }

    return this.extractText(result).trim() || fallback;
  }
}
