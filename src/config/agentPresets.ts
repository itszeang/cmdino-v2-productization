import type { AgentKind } from "../domain/agentKind";

export type AgentPresetId =
  | "claude-planner"
  | "codex-builder"
  | "gemini-reviewer"
  | "ollama-worker"
  | "custom-agent";

export interface AgentPreset {
  id:               AgentPresetId;
  title:            string;
  defaultLabel:     string;
  agentKind:        AgentKind;
  defaultCommand:   string;
  defaultDinoId?:   string;
  roleDescription:  string;
  defaultAttachment?: {
    path:     string;
    fileName: string;
  };
  accentColor: string;
}

export const AGENT_PRESETS: AgentPreset[] = [
  {
    id:              "claude-planner",
    title:           "Claude Planner",
    defaultLabel:    "Claude Planner",
    agentKind:       "claude",
    defaultCommand:  "claude",
    defaultDinoId:   "female-cole",
    roleDescription: "Breaks requests into implementation plans.",
    defaultAttachment: {
      path:     "cmdino-preset://claude-planner.md",
      fileName: "claude-planner.md",
    },
    accentColor: "#e5e5e5",
  },
  {
    id:              "codex-builder",
    title:           "Codex Builder",
    defaultLabel:    "Codex Builder",
    agentKind:       "codex",
    defaultCommand:  "codex",
    defaultDinoId:   "male-kira",
    roleDescription: "Implements scoped patches.",
    defaultAttachment: {
      path:     "cmdino-preset://codex-builder.md",
      fileName: "codex-builder.md",
    },
    accentColor: "#d4d4d4",
  },
  {
    id:              "gemini-reviewer",
    title:           "Gemini Reviewer",
    defaultLabel:    "Gemini Reviewer",
    agentKind:       "gemini",
    defaultCommand:  "gemini",
    defaultDinoId:   "female-kira",
    roleDescription: "Reviews architecture, risks, UX, and tests.",
    defaultAttachment: {
      path:     "cmdino-preset://gemini-reviewer.md",
      fileName: "gemini-reviewer.md",
    },
    accentColor: "#a3a3a3",
  },
  {
    id:              "ollama-worker",
    title:           "Ollama Worker",
    defaultLabel:    "Ollama Worker",
    agentKind:       "ollama",
    defaultCommand:  "ollama run llama3",
    defaultDinoId:   "female-loki",
    roleDescription: "Local/offline assistant worker.",
    defaultAttachment: {
      path:     "cmdino-preset://ollama-worker.md",
      fileName: "ollama-worker.md",
    },
    accentColor: "#737373",
  },
  {
    id:              "custom-agent",
    title:           "Custom Agent",
    defaultLabel:    "Custom Agent",
    agentKind:       "custom",
    defaultCommand:  "",
    defaultDinoId:   undefined,
    roleDescription: "User-defined terminal agent.",
    accentColor:     "#525252",
  },
];
