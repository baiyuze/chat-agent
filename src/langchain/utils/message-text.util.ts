export function extractText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  if (typeof record.content === "string") return record.content;
  if (
    record.kwargs &&
    typeof record.kwargs === "object" &&
    typeof (record.kwargs as Record<string, unknown>).content === "string"
  ) {
    return (record.kwargs as { content: string }).content;
  }
  if (Array.isArray(record.content)) {
    return record.content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text: unknown }).text ?? "");
        }
        return "";
      })
      .join("");
  }

  return "";
}

export function getLatestAssistantText(
  result: unknown,
  fallback = "没有生成可显示的回答。",
): string {
  const resultRecord = result as {
    messages?: unknown[];
    model_request?: { messages?: unknown[] };
  };
  const messages =
    resultRecord.messages ?? resultRecord.model_request?.messages ?? [];

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const text = extractText(messages[index]).trim();
    if (text) return text;
  }

  return extractText(result).trim() || fallback;
}
