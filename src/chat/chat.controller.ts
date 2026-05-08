import { Body, Controller, Get, Post, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { ChatHistoryService } from "./chat-history.service";
import { LangChainService } from "../langchain/langchain.service";
import { ChatMessage, ChatRequest } from "./chat.types";

@Controller("chat")
export class ChatController {
  constructor(
    private readonly langChainService: LangChainService,
    private readonly chatHistoryService: ChatHistoryService,
  ) {}

  @Get("sessions")
  async sessions(@Query("limit") limit?: string) {
    return {
      sessions: await this.chatHistoryService.listSessions(Number(limit) || 30),
    };
  }

  @Get("history")
  async history(@Query("sessionId") sessionId?: string) {
    return {
      messages: await this.chatHistoryService.listMessages(
        this.normalizeSessionId(sessionId),
      ),
    };
  }

  @Post()
  async chat(@Body() body: ChatRequest) {
    const messages = this.normalizeMessages(body?.messages);
    const sessionId = this.getSessionId(body);
    const reply = await this.langChainService.chat(messages);

    await this.persistTurn(sessionId, messages, reply);

    return { reply };
  }

  @Post("stream")
  async stream(@Body() body: ChatRequest, @Res() response: Response) {
    const messages = this.normalizeMessages(body?.messages);
    const sessionId = this.getSessionId(body);
    let reply = "";

    response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.flushHeaders?.();

    const sendEvent = (event: string, data: unknown) => {
      response.write(`event: ${event}\n`);
      response.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent("start", { ok: true });

    try {
      for await (const event of this.langChainService.streamChat(messages)) {
        if (event.type === "delta") {
          sendEvent("delta", { text: event.text });
          reply += event.text;
          continue;
        }

        sendEvent("activity", {
          status: event.status,
          title: event.title,
          detail: event.detail,
        });
      }

      await this.persistTurn(sessionId, messages, reply);
      sendEvent("done", { ok: true });
    } catch (error) {
      sendEvent("error", {
        message: error instanceof Error ? error.message : "服务异常",
      });
    } finally {
      response.end();
    }
  }

  private normalizeMessages(messages: ChatRequest["messages"]): ChatMessage[] {
    if (!Array.isArray(messages)) {
      throw new Error("请输入消息内容");
    }

    const normalized = messages.filter(
      (message): message is ChatMessage =>
        (message?.role === "user" || message?.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
    );

    if (normalized.length === 0) {
      throw new Error("请输入消息内容");
    }

    return normalized.map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }));
  }

  private getSessionId(body: ChatRequest) {
    return this.normalizeSessionId(body?.sessionId);
  }

  private normalizeSessionId(sessionId: unknown) {
    if (typeof sessionId === "string" && sessionId.trim()) {
      return sessionId.trim().slice(0, 64);
    }

    return "default";
  }

  private async persistTurn(
    sessionId: string,
    messages: ChatMessage[],
    reply: string,
  ) {
    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");

    if (latestUserMessage) {
      await this.chatHistoryService.saveMessage({
        sessionId,
        role: "user",
        content: latestUserMessage.content,
      });
    }

    if (reply.trim()) {
      await this.chatHistoryService.saveMessage({
        sessionId,
        role: "assistant",
        content: reply,
      });
    }
  }
}
