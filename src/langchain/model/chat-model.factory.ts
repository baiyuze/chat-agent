import { ChatOpenAI } from "@langchain/openai";

export function createChatModel() {
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
