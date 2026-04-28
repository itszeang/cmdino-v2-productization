import type { AgentKind } from "../domain/agentKind";

export interface AgentPreset {
  id: AgentKind;
  label: string;
  defaultLabel: string;
  defaultCommand: string;
  accentColor: string;
}

export const AGENT_PRESETS: AgentPreset[] = [
  {
    id: "claude",
    label: "Claude",
    defaultLabel: "Claude Builder",
    defaultCommand: "claude",
    accentColor: "#00c8ff",
  },
  {
    id: "codex",
    label: "Codex",
    defaultLabel: "Codex Reviewer",
    defaultCommand: "codex",
    accentColor: "#a855f7",
  },
  {
    id: "gemini",
    label: "Gemini",
    defaultLabel: "Gemini Agent",
    defaultCommand: "gemini",
    accentColor: "#22c55e",
  },
  {
    id: "custom",
    label: "Custom",
    defaultLabel: "Custom Agent",
    defaultCommand: "",
    accentColor: "#facc15",
  },
];
