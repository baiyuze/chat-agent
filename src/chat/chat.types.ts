export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatRequest = {
  sessionId?: string;
  messages?: ChatMessage[];
};

export type ChatSessionSummary = {
  sessionId: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
  messageCount: number;
};
