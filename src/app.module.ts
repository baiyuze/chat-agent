import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChatHistoryService } from "./chat/chat-history.service";
import { ChatMessageEntity } from "./chat/chat-message.entity";
import { ChatController } from "./chat/chat.controller";
import { LangChainService } from "./langchain/langchain.service";
import { McpClientService } from "./mcp/mcp-client.service";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.PG_HOST ?? "127.0.0.1",
      port: Number(process.env.PG_PORT ?? 5432),
      username: process.env.PG_USER ?? "postgres",
      password: process.env.PG_PASSWORD ?? "mypassword",
      database: process.env.PG_DATABASE ?? "ai_knowledge_base",
      entities: [ChatMessageEntity],
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature([ChatMessageEntity]),
  ],
  controllers: [ChatController],
  providers: [LangChainService, ChatHistoryService, McpClientService],
})
export class AppModule {}
