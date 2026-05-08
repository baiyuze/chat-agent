import { FileText, MessageSquarePlus, Search } from "lucide-react";
import type { ChatSession } from "../../types/chat";
import { Button } from "../ui/button";

export const suggestions = [
  "LangChain 入门路线",
  "对比 Agent 和 Chain",
  "生成调研报告大纲",
];

export function Sidebar({
  activeSessionId,
  isStreaming,
  onNewSession,
  onSelectSession,
  onSuggestion,
  sessions,
}: {
  activeSessionId: string;
  isStreaming: boolean;
  onNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onSuggestion: (suggestion: string) => void;
  sessions: ChatSession[];
}) {
  return (
    <aside className="hidden min-h-0 min-w-0 overflow-y-auto border-r border-border bg-card px-4 py-5 lg:block">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">LangChain Chat</p>
        <p className="text-xs text-muted-foreground">Research workspace</p>
      </div>

      <div className="mt-6 space-y-3">
        <Button
          className="w-full justify-start gap-2"
          disabled={isStreaming}
          onClick={onNewSession}
          type="button"
        >
          <MessageSquarePlus className="h-4 w-4" />
          新会话
        </Button>

        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center gap-2 px-1 text-sm font-medium">
            <FileText className="h-4 w-4 shrink-0" />
            历史会话
          </div>
          <div className="mt-3 space-y-1">
            {sessions.length === 0 ? (
              <p className="px-1 py-2 text-sm text-muted-foreground">
                暂无历史记录
              </p>
            ) : (
              sessions.map((session) => (
                <button
                  className={[
                    "block w-full min-w-0 rounded-md px-2 py-2 text-left text-sm transition-colors",
                    session.sessionId === activeSessionId
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  ].join(" ")}
                  disabled={isStreaming}
                  key={session.sessionId}
                  onClick={() => onSelectSession(session.sessionId)}
                  type="button"
                >
                  <span className="block min-w-0 truncate font-medium leading-5">
                    {session.title}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            工作能力
          </div>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <p>联网检索</p>
            <p>Markdown 输出</p>
            <p>流式响应</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Search className="h-4 w-4" />
            快速开始
          </div>
          <div className="mt-3 flex flex-col gap-1">
            {suggestions.map((suggestion) => (
              <Button
                className="justify-start px-2 text-left text-muted-foreground"
                disabled={isStreaming}
                key={suggestion}
                onClick={() => onSuggestion(suggestion)}
                type="button"
                variant="ghost"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
