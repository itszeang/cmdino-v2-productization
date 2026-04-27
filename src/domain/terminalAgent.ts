export type DinoId = string;

export interface TerminalAgent {
  id: string;
  label: string;
  dinoId: DinoId;
  launchCommand?: string;
  cwd?: string;
}

export function createTerminalAgent(
  id: string,
  label: string,
  dinoId: DinoId,
  launchCommand?: string,
  cwd?: string
): TerminalAgent {
  return { id, label, dinoId, launchCommand, cwd };
}
