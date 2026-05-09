import { Injectable, Logger } from "@nestjs/common";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { ChatMessage } from "../chat/chat.types";
import { McpClientService } from "../mcp/mcp-client.service";
import { ChatMessageEntity } from "../chat/chat-message.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { summarizeToolOutput } from "./events/tool-output.util";
import { LangChainStreamEvent } from "./langchain.types";
import { createChatModel } from "./model/chat-model.factory";
import { loadPrompt } from "../common/prompt-loader";
import { getCurrentDateTimeText } from "./utils/date.util";
import { createCustomTools } from "./tools/custom-tools.factory";
import { createInternetSearchTool } from "./tools/internet-search.tool";
import { compactJson } from "./utils/json.util";
import {
  extractText,
  getLatestAssistantText,
} from "./utils/message-text.util";
import { withTimeout } from "./utils/timeout.util";

@Injectable()
export class LangChainService {
  private readonly logger = new Logger(LangChainService.name);
  private readonly chatTimeoutMs = Number(process.env.CHAT_TIMEOUT_MS ?? 60000);

  private agentPromise?: Promise<ReturnType<typeof createDeepAgent>>;

  constructor(
    private readonly mcpClientService: McpClientService,
    @InjectRepository(ChatMessageEntity)
    private readonly messages: Repository<ChatMessageEntity>,
  ) {}

  async chat(messages: ChatMessage[]): Promise<string> {
    const agent = await this.getAgent();
    const result = await withTimeout(
      agent.invoke({ messages }),
      this.chatTimeoutMs,
    );

    return getLatestAssistantText(result);
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
        const input = compactJson((event.data as { input?: unknown }).input);
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
        const output = summarizeToolOutput(
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
      const text = extractText(chunk);
      if (text) yield { type: "delta", text };
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
    const customTools = createCustomTools(this.messages);

    return createDeepAgent({
      model: createChatModel(),
      tools: [createInternetSearchTool(), ...mcpTools, ...customTools],
      backend: new FilesystemBackend({
        rootDir: process.env.LOCAL_FILE_ROOT ?? process.cwd(),
        virtualMode: true,
      }),
      systemPrompt: [
        "当前日期时间：" + getCurrentDateTimeText(),
        "",
        loadPrompt("research.md"),
        mcpToolPromptSection,
      ].join("\n"),
    });
  }
}
