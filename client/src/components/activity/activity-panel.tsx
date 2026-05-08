import { CheckCircle2, Clock3, TerminalSquare } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import type { Activity } from "../../types/chat";
import { ActivityDetail } from "./activity-detail";

export function ActivityPanel({ activities }: { activities: Activity[] }) {
  return (
    <aside className="hidden min-h-0 min-w-0 max-w-full overflow-hidden border-l border-border bg-card xl:flex xl:flex-col">
      <div className="shrink-0 border-b border-border px-3 py-3">
        <div className="flex min-w-0 items-center gap-2 text-[13px] font-semibold">
          <TerminalSquare className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">执行过程</span>
        </div>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          工具调用、模型请求和返回摘要会显示在这里。
        </p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="min-w-0 space-y-2.5 p-3">
          {activities.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
              暂无执行记录。
            </div>
          ) : (
            activities.map((activity) => (
              <div
                className="min-w-0 overflow-hidden rounded-md border border-border bg-background p-2.5 text-xs"
                key={activity.id}
              >
                <div className="flex min-w-0 items-center gap-2 font-medium">
                  {activity.status === "complete" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-foreground" />
                  ) : (
                    <Clock3 className="h-3.5 w-3.5 shrink-0 animate-pulse text-muted-foreground" />
                  )}
                  <span className="min-w-0 break-words leading-5 [overflow-wrap:anywhere]">
                    {activity.title}
                  </span>
                </div>
                {activity.detail && <ActivityDetail detail={activity.detail} />}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
