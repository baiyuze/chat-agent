export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

export type Activity = {
  id: string;
  status: "running" | "complete";
  title: string;
  detail?: string;
};

export type ChatSession = {
  sessionId: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
  messageCount: number;
};
