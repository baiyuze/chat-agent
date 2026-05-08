import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityPanel } from "./components/activity/activity-panel";
import { ChatHeader } from "./components/chat/chat-header";
import { Composer } from "./components/chat/composer";
import { MessageBubble } from "./components/chat/message-bubble";
import { Sidebar } from "./components/layout/sidebar";
import { fetchHistory, fetchSessions } from "./lib/history";
import { createSessionId, getSessionId, setSessionId } from "./lib/session";
import { readSseEvents } from "./lib/sse";
import type { Activity, ChatMessage, ChatSession } from "./types/chat";

const initialMessages: ChatMessage[] = [
  {
    id: crypto.randomUUID(),
    role: "assistant",
    content:
      "可以开始提问。需要联网检索时，右侧会显示工具调用、参数和返回摘要。",
  },
];

export function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setActiveSessionId] = useState(() => getSessionId());
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const apiMessages = useMemo(
    () =>
      messages
        .filter((message) => !message.streaming)
        .map(({ role, content }) => ({ role, content })),
    [messages],
  );

  useEffect(() => {
    void refreshSessions();
    void loadCurrentSession(sessionId);
  }, []);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ block: "end" });
    });
  }

  function updateAssistant(id: string, content: string, streaming: boolean) {
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, content, streaming } : message,
      ),
    );
    scrollToBottom();
  }

  function addActivity(activity: Omit<Activity, "id">) {
    setActivities((current) => [
      {
        id: crypto.randomUUID(),
        ...activity,
      },
      ...current,
    ]);
  }

  async function refreshSessions() {
    try {
      setSessions(await fetchSessions());
    } catch (error) {
      addActivity({
        status: "complete",
        title: "历史会话加载失败",
        detail: error instanceof Error ? error.message : "服务异常",
      });
    }
  }

  async function loadCurrentSession(currentSessionId: string) {
    try {
      const history = await fetchHistory(currentSessionId);
      if (history.length > 0) {
        setMessages(history);
        scrollToBottom();
      }
    } catch {
      // Empty or unavailable history should not block a fresh conversation.
    }
  }

  async function selectSession(nextSessionId: string) {
    if (isStreaming || nextSessionId === sessionId) return;

    setSessionId(nextSessionId);
    setActiveSessionId(nextSessionId);
    setActivities([]);

    try {
      const history = await fetchHistory(nextSessionId);
      setMessages(history.length > 0 ? history : initialMessages);
      scrollToBottom();
    } catch (error) {
      addActivity({
        status: "complete",
        title: "历史消息加载失败",
        detail: error instanceof Error ? error.message : "服务异常",
      });
    }
  }

  function startNewSession() {
    if (isStreaming) return;

    const nextSessionId = createSessionId();
    setSessionId(nextSessionId);
    setActiveSessionId(nextSessionId);
    setMessages(initialMessages);
    setActivities([]);
    setInput("");
  }

  async function sendMessage(nextInput = input) {
    const content = nextInput.trim();
    if (!content || isStreaming) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    const assistantId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
    };
    const requestMessages = [
      ...apiMessages,
      { role: "user" as const, content },
    ];

    setInput("");
    setIsStreaming(true);
    setMessages((current) => [...current, userMessage, assistantMessage]);
    addActivity({
      status: "running",
      title: "收到请求",
      detail: content,
    });
    scrollToBottom();

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: requestMessages,
        }),
      });

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        throw new Error(data.message || data.error || "请求失败");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let reply = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        buffer = readSseEvents(buffer, (event, data) => {
          if (event === "activity") {
            addActivity({
              status:
                data.status === "complete" || data.status === "running"
                  ? data.status
                  : "running",
              title: String(data.title ?? "执行事件"),
              detail: data.detail ? String(data.detail) : undefined,
            });
          }

          if (event === "delta") {
            reply += String(data.text ?? "");
            updateAssistant(assistantId, reply, true);
          }

          if (event === "error") {
            throw new Error(String(data.message ?? "服务异常"));
          }
        });
      }

      updateAssistant(assistantId, reply || "没有生成可显示的回答。", false);
      void refreshSessions();
    } catch (error) {
      updateAssistant(
        assistantId,
        `请求失败：${error instanceof Error ? error.message : "服务异常"}`,
        false,
      );
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <main className="h-dvh overflow-hidden bg-background text-foreground">
      <div className="grid h-full min-h-0 grid-cols-[260px_minmax(0,1fr)] overflow-hidden xl:grid-cols-[260px_minmax(0,1fr)_minmax(260px,280px)]">
        <Sidebar
          activeSessionId={sessionId}
          isStreaming={isStreaming}
          onNewSession={startNewSession}
          onSelectSession={(nextSessionId) => void selectSession(nextSessionId)}
          onSuggestion={(suggestion) => void sendMessage(suggestion)}
          sessions={sessions}
        />

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <ChatHeader />

          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30">
            <div className="mx-auto flex max-w-4xl flex-col gap-5 px-5 py-6">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          <Composer
            input={input}
            isStreaming={isStreaming}
            onInputChange={setInput}
            onSubmit={() => void sendMessage()}
          />
        </section>

        <ActivityPanel activities={activities} />
      </div>
    </main>
  );
}
