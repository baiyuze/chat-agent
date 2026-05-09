import { compactJson } from "../utils/json.util";
import { extractText } from "../utils/message-text.util";

export function summarizeToolOutput(value: unknown): string | undefined {
  const content = extractText(value);
  if (!content) return compactJson(value);

  try {
    const parsed = JSON.parse(content) as {
      query?: string;
      results?: Array<{
        title?: string;
        url?: string;
        published_date?: string;
        score?: number;
      }>;
    };
    const lines = [
      parsed.query ? `query: ${parsed.query}` : undefined,
      ...(parsed.results ?? []).slice(0, 5).map((result, index) => {
        const parts = [
          `${index + 1}. ${result.title ?? "Untitled"}`,
          result.published_date ? `date: ${result.published_date}` : undefined,
          result.url,
        ].filter(Boolean);
        return parts.join(" | ");
      }),
    ].filter(Boolean);

    return lines.join("\n");
  } catch {
    return compactJson(content);
  }
}
