export type AgentKind = "claude" | "codex" | "gemini" | "custom";

export function inferAgentKind(launchCommand?: string): AgentKind {
  const cmd = launchCommand?.trim().split(/\s+/)[0].toLowerCase() ?? "";
  if (cmd === "claude") return "claude";
  if (cmd === "codex")  return "codex";
  if (cmd === "gemini") return "gemini";
  return "custom";
}
