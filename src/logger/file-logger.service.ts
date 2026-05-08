import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { LoggerService } from "@nestjs/common";

export class FileLogger implements LoggerService {
  private readonly logFile = join(process.cwd(), "logs", "app.log");

  constructor() {
    mkdirSync(dirname(this.logFile), { recursive: true });
  }

  log(message: unknown, context?: string) {
    this.write("log", message, context);
  }

  error(message: unknown, trace?: string, context?: string) {
    this.write("error", message, context, trace);
  }

  warn(message: unknown, context?: string) {
    this.write("warn", message, context);
  }

  debug(message: unknown, context?: string) {
    this.write("debug", message, context);
  }

  verbose(message: unknown, context?: string) {
    this.write("verbose", message, context);
  }

  private write(
    level: string,
    message: unknown,
    context?: string,
    trace?: string,
  ) {
    const line = JSON.stringify({
      time: new Date().toISOString(),
      level,
      context,
      message: this.stringify(message),
      trace,
    });

    appendFileSync(this.logFile, `${line}\n`, "utf8");

    const rendered = context ? `[${context}] ${this.stringify(message)}` : this.stringify(message);
    if (level === "error") {
      console.error(rendered, trace ?? "");
      return;
    }
    if (level === "warn") {
      console.warn(rendered);
      return;
    }
    console.log(rendered);
  }

  private stringify(value: unknown) {
    if (typeof value === "string") return value;

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}
