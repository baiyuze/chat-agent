import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function loadPrompt(name: string) {
  return readFileSync(resolvePromptPath(name), "utf8");
}

function resolvePromptPath(name: string) {
  const candidates = [
    process.env.PROMPTS_DIR ? join(process.env.PROMPTS_DIR, name) : undefined,
    join(process.cwd(), "src", "prompts", name),
    join(process.cwd(), "prompts", name),
  ].filter(Boolean) as string[];

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error("Prompt file not found: " + name);
  }

  return found;
}
