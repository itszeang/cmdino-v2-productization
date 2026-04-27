export type DinoId = string;

export interface TerminalAgent {
  id: string;
  label: string;
  dinoId: DinoId;
  logs: string[];
}

export function createTerminalAgent(
  id: string,
  label: string,
  dinoId: DinoId
): TerminalAgent {
  return { id, label, dinoId, logs: [] };
}
