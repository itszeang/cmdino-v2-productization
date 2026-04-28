import type { AgentKind } from "./agentKind";
import type { TerminalAttachment } from "./orchestration";

export type DinoId = string;

export interface TerminalAgent {
  id:             string;
  configId:       string;
  label:          string;
  dinoId:         DinoId;
  launchCommand?: string;
  cwd?:           string;
  agentKind?:     AgentKind;
  attachments:    TerminalAttachment[];
}

export function createTerminalAgent(
  id:             string,
  label:          string,
  dinoId:         DinoId,
  launchCommand?: string,
  cwd?:           string,
  agentKind?:     AgentKind,
): TerminalAgent {
  return {
    id,
    configId:    crypto.randomUUID(),
    label,
    dinoId,
    launchCommand,
    cwd,
    agentKind,
    attachments: [],
  };
}
