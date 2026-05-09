import { McpToolDefinition } from "./mcp.types";

export function renderMcpToolLines(tools: McpToolDefinition[]) {
  return tools
    .map((definition) => {
      const description = compactDescription(definition.description);
      return "- " + definition.name + (description ? "：" + description : "");
    })
    .join("\n");
}

function compactDescription(value?: string) {
  if (!value) return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 140
    ? normalized.slice(0, 139) + "..."
    : normalized;
}
