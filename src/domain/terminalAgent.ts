export type DinoId = string;

export interface TerminalAgent {
  id: string;
  label: string;
  dinoId: DinoId;
}

export function createTerminalAgent(
  id: string,
  label: string,
  dinoId: DinoId
): TerminalAgent {
  return { id, label, dinoId };
}
