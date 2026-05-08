import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ChatMessageEntity } from "./chat-message.entity";
import { ChatMessage, ChatSessionSummary } from "./chat.types";

@Injectable()
export class ChatHistoryService {
  constructor(
    @InjectRepository(ChatMessageEntity)
    private readonly messages: Repository<ChatMessageEntity>,
  ) {}

  async saveMessage(input: {
    sessionId: string;
    role: "user" | "assistant";
    content: string;
  }) {
    await this.messages.save(this.messages.create(input));
  }

  async listSessions(limit = 30): Promise<ChatSessionSummary[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const rows = await this.messages
      .createQueryBuilder("message")
      .select("message.sessionId", "sessionId")
      .addSelect("MAX(message.createdAt)", "updatedAt")
      .addSelect("COUNT(message.id)", "messageCount")
      .groupBy("message.sessionId")
      .orderBy('"updatedAt"', "DESC")
      .limit(safeLimit)
      .getRawMany<{
        sessionId: string;
        updatedAt: Date | string;
        messageCount: string;
      }>();

    const sessionIds = rows.map((row) => row.sessionId);
    if (sessionIds.length === 0) return [];

    const messages = await this.messages
      .createQueryBuilder("message")
      .where("message.sessionId IN (:...sessionIds)", { sessionIds })
      .orderBy("message.sessionId", "ASC")
      .addOrderBy("message.createdAt", "ASC")
      .addOrderBy("message.id", "ASC")
      .getMany();

    const groupedMessages = new Map<string, ChatMessageEntity[]>();
    for (const message of messages) {
      const sessionMessages = groupedMessages.get(message.sessionId) ?? [];
      sessionMessages.push(message);
      groupedMessages.set(message.sessionId, sessionMessages);
    }

    return rows.map((row) => {
      const sessionMessages = groupedMessages.get(row.sessionId) ?? [];
      const firstMessage = sessionMessages[0];
      const lastMessage = sessionMessages[sessionMessages.length - 1];

      return {
        sessionId: row.sessionId,
        title: this.compact(firstMessage?.content || "新会话", 32),
        lastMessage: this.compact(lastMessage?.content || "", 72),
        updatedAt: this.toIsoString(row.updatedAt),
        messageCount: Number(row.messageCount) || sessionMessages.length,
      };
    });
  }

  async listMessages(sessionId: string): Promise<ChatMessage[]> {
    const rows = await this.messages.find({
      where: { sessionId },
      order: { createdAt: "ASC", id: "ASC" },
    });

    return rows.map((message) => ({
      role: message.role,
      content: message.content,
    }));
  }

  private compact(value: string, maxLength: number) {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength - 1)}...`;
  }

  private toIsoString(value: Date | string) {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
