import { Loader2, PanelRight, SendHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

export function Composer({
  input,
  isStreaming,
  onInputChange,
  onSubmit,
}: {
  input: string;
  isStreaming: boolean;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-border bg-card px-5 py-4">
      <form
        className="mx-auto max-w-4xl rounded-lg border border-border bg-background p-2 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="flex items-start gap-2">
          <Textarea
            className="max-h-40 min-h-12 resize-none border-0 px-3 py-3 shadow-none focus-visible:ring-0"
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                onSubmit();
              }
            }}
            placeholder="输入问题，Enter 发送，Shift+Enter 换行..."
            value={input}
          />
          <Button
            aria-label="发送"
            className="mt-1 h-10 w-10 shrink-0 rounded-md p-0"
            disabled={isStreaming || !input.trim()}
            title="发送"
            type="submit"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between px-2 pb-1 pt-2 text-xs text-muted-foreground">
          <span>支持 Markdown、联网搜索和流式返回</span>
          <span className="hidden items-center gap-1 sm:flex">
            <PanelRight className="h-3.5 w-3.5" />
            Shift + Enter 换行
          </span>
        </div>
      </form>
    </div>
  );
}
