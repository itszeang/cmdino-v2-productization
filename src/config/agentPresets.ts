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
    accentColor: "#e5e5e5",
  },
  {
    id: "codex",
    label: "Codex",
    defaultLabel: "Codex Reviewer",
    defaultCommand: "codex",
    accentColor: "#d4d4d4",
  },
  {
    id: "gemini",
    label: "Gemini",
    defaultLabel: "Gemini Agent",
    defaultCommand: "gemini",
    accentColor: "#a3a3a3",
  },
  {
    id: "custom",
    label: "Custom",
    defaultLabel: "Custom Agent",
    defaultCommand: "",
    accentColor: "#737373",
  },
];
