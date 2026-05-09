import { McpJsonRpcResponse } from "./mcp.types";

export function parseMcpResponse<T>(text: string): McpJsonRpcResponse<T> {
  const dataLines = text
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s?/, "").trim())
    .filter(Boolean);

  const payloadText = dataLines.length > 0 ? dataLines.at(-1)! : text.trim();
  return JSON.parse(payloadText) as McpJsonRpcResponse<T>;
}

export function renderToolResult(result: unknown) {
  if (typeof result === "string") return result;

  if (result && typeof result === "object") {
    const content = (result as { content?: unknown }).content;
    if (Array.isArray(content)) {
      const text = content
        .map((item) => {
          if (typeof item === "string") return item;
          if (
            item &&
            typeof item === "object" &&
            typeof (item as { text?: unknown }).text === "string"
          ) {
            return (item as { text: string }).text;
          }
          return "";
        })
        .filter(Boolean)
        .join("\n");

      if (text) return text;
    }
  }

  return JSON.stringify(result);
}
