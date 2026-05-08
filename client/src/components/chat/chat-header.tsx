export function ChatHeader() {
  return (
    <header className="flex h-18 shrink-0 items-center justify-between border-b border-border bg-card px-5">
      <div>
        <h1 className="text-xl font-semibold tracking-normal">
          LangChain Chat
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          NestJS + LangChain
        </p>
      </div>

      <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-foreground" />
        服务在线
      </div>
    </header>
  );
}
