// Structured JSON logging — backend/logging-guidelines.md.
// One JSON object per line: { ts, level, event, ...fields }. `event` is a
// dotted name (e.g. "ai.call", "ai.fallback").

type Level = "debug" | "info" | "warn" | "error";

const isProd = process.env.NODE_ENV === "production";

function emit(level: Level, event: string, fields: Record<string, unknown>): void {
  // Full prompts/outputs are debug-only and dropped in prod (may carry game state).
  if (level === "debug" && isProd) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (event: string, fields: Record<string, unknown> = {}) => emit("debug", event, fields),
  info: (event: string, fields: Record<string, unknown> = {}) => emit("info", event, fields),
  warn: (event: string, fields: Record<string, unknown> = {}) => emit("warn", event, fields),
  error: (event: string, fields: Record<string, unknown> = {}) => emit("error", event, fields),
};
