function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function unwrapToolInput(value: string) {
  const parsed = safeJsonParse(value);
  if (!parsed || typeof parsed !== "object") return undefined;

  const input = (parsed as { input?: unknown }).input;
  if (typeof input === "string") {
    return safeJsonParse(input) ?? input;
  }

  return input;
}

export function ActivityDetail({ detail }: { detail: string }) {
  const toolInput = unwrapToolInput(detail);
  if (toolInput && typeof toolInput === "object") {
    return (
      <dl className="mt-2 min-w-0 space-y-1.5 overflow-hidden rounded-md bg-muted p-2.5 text-[11px] leading-4">
        {Object.entries(toolInput as Record<string, unknown>).map(
          ([key, value]) => (
            <div className="grid min-w-0 gap-1" key={key}>
              <dt className="min-w-0 break-words font-medium text-foreground">
                {key}
              </dt>
              <dd className="min-w-0 break-words text-muted-foreground [overflow-wrap:anywhere]">
                {typeof value === "string" ? value : JSON.stringify(value)}
              </dd>
            </div>
          ),
        )}
      </dl>
    );
  }

  if (detail.startsWith("query:")) {
    const [queryLine, ...resultLines] = detail.split("\n").filter(Boolean);

    return (
      <div className="mt-2 min-w-0 space-y-1.5 overflow-hidden">
        <div className="min-w-0 overflow-hidden rounded-md bg-muted p-2 text-[11px] leading-4">
          <span className="font-medium text-foreground">Query</span>
          <p className="mt-1 min-w-0 break-words text-muted-foreground [overflow-wrap:anywhere]">
            {queryLine.replace(/^query:\s*/, "")}
          </p>
        </div>

        {resultLines.length > 0 && (
          <ol className="min-w-0 space-y-1.5">
            {resultLines.map((line) => {
              const normalized = line.replace(/^\d+\.\s*/, "");
              const [title = "Untitled", datePart, url] = normalized
                .split(" | ")
                .map((part) => part.trim());

              return (
                <li
                  className="min-w-0 overflow-hidden rounded-md border border-border bg-background p-2 text-[11px]"
                  key={line}
                >
                  <p className="min-w-0 break-words font-medium leading-5 text-foreground [overflow-wrap:anywhere]">
                    {title}
                  </p>
                  {datePart && (
                    <p className="mt-1 min-w-0 break-words text-muted-foreground [overflow-wrap:anywhere]">
                      {datePart}
                    </p>
                  )}
                  {url && (
                    <a
                      className="mt-1 block min-w-0 break-all text-muted-foreground underline underline-offset-2 [overflow-wrap:anywhere]"
                      href={url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {url}
                    </a>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    );
  }

  const parsed = safeJsonParse(detail);
  const rendered =
    parsed && typeof parsed === "object"
      ? JSON.stringify(parsed, null, 2)
      : detail;

  return (
    <pre className="mt-2 max-h-40 min-w-0 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-2 text-[11px] leading-4 text-muted-foreground [overflow-wrap:anywhere]">
      {rendered}
    </pre>
  );
}
