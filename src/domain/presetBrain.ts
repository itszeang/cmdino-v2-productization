export type PresetBrainId =
  | "claude-planner-brain"
  | "codex-builder-brain"
  | "gemini-reviewer-brain"
  | "ollama-worker-brain";

export interface PresetBrainFile {
  id:              PresetBrainId;
  title:           string;
  fileName:        string;
  path:            string;
  description:     string;
  defaultSelected: boolean;
}
