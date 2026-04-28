import type { AgentKind } from "./agentKind";

export type DinoId = string;

export interface TerminalAgent {
  id: string;
  label: string;
  dinoId: DinoId;
  launchCommand?: string;
  cwd?: string;
  agentKind?: AgentKind;
}

export function createTerminalAgent(
  id: string,
  label: string,
  dinoId: DinoId,
  launchCommand?: string,
  cwd?: string,
  agentKind?: AgentKind,
): TerminalAgent {
  return { id, label, dinoId, launchCommand, cwd, agentKind };
}
