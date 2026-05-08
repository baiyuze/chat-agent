export function readSseEvents(
  buffer: string,
  onEvent: (event: string, data: Record<string, unknown>) => void,
) {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";

  for (const part of parts) {
    const lines = part.split("\n");
    const event = lines
      .find((line) => line.startsWith("event:"))
      ?.replace("event:", "")
      .trim();
    const data = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.replace("data:", "").trim())
      .join("\n");

    if (event && data) {
      onEvent(event, JSON.parse(data) as Record<string, unknown>);
    }
  }

  return rest;
}
