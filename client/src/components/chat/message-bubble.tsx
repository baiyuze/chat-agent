import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, MessageSquareText, UserRound } from "lucide-react";
import type { ChatMessage } from "../../types/chat";
import { cn } from "../../lib/utils";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "justify-end")}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
          <MessageSquareText size={16} />
        </div>
      )}

      <article
        className={cn(
          "max-w-[78%] rounded-lg px-4 py-3 text-[15px] leading-7",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card text-card-foreground",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words font-medium">
            {message.content}
          </p>
        ) : (
          <div className="markdown-body">
            {message.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                等待响应
              </div>
            )}
          </div>
        )}
      </article>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <UserRound size={16} />
        </div>
      )}
    </div>
  );
}
