import type { ChatMessage, ChatSession } from "../types/chat";

export async function fetchSessions() {
  const response = await fetch("/api/chat/sessions");
  if (!response.ok) throw new Error("历史会话加载失败");

  const data = (await response.json()) as { sessions?: ChatSession[] };
  return data.sessions ?? [];
}

export async function fetchHistory(sessionId: string) {
  const response = await fetch(
    `/api/chat/history?sessionId=${encodeURIComponent(sessionId)}`,
  );
  if (!response.ok) throw new Error("历史消息加载失败");

  const data = (await response.json()) as {
    messages?: Array<Pick<ChatMessage, "role" | "content">>;
  };

  return (data.messages ?? []).map((message) => ({
    id: crypto.randomUUID(),
    role: message.role,
    content: message.content,
  }));
}
