import { TavilySearch } from "@langchain/tavily";
import { tool } from "langchain";
import { z } from "zod";

export function createInternetSearchTool() {
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
