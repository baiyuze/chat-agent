import { tool } from "langchain";
import { z } from "zod";
import { Repository } from "typeorm";
import { ChatMessageEntity } from "../../chat/chat-message.entity";
import { compactJson } from "../utils/json.util";

export function createCustomTools(messages: Repository<ChatMessageEntity>) {
  const sqlTool = tool(
    async ({ query }: { query: string }) => {
      const rawData = await messages.query(query);
      return compactJson(rawData);
    },
    {
      name: "message_sql_query",
      description: "查询当前agent消息，数据库表的的 SQL 查询",
      schema: z.object({
        query: z.string().describe("要执行的 SQL 查询"),
      }),
    },
  );

  return [sqlTool];
}
