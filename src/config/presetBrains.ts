import type { PresetBrainFile, PresetBrainId } from "../domain/presetBrain";
import type { TerminalAttachment } from "../domain/orchestration";

export const PRESET_BRAINS: PresetBrainFile[] = [
  {
    id:              "claude-planner-brain",
    title:           "Claude Planner Brain",
    fileName:        "CLAUDE.md",
    path:            "cmdino-preset://claude",
    description:     "Planning role — breaks requests into scoped implementation steps.",
    defaultSelected: true,
  },
  {
    id:              "codex-builder-brain",
    title:           "Codex Builder Brain",
    fileName:        "CODEX.md",
    path:            "cmdino-preset://codex",
    description:     "Implementation role — applies minimal, scoped patches from a plan.",
    defaultSelected: true,
  },
  {
    id:              "gemini-reviewer-brain",
    title:           "Gemini Reviewer Brain",
    fileName:        "GEMINI.md",
    path:            "cmdino-preset://gemini",
    description:     "Review role — flags risks, UX issues, and missing tests.",
    defaultSelected: true,
  },
  {
    id:              "ollama-worker-brain",
    title:           "Ollama Worker Brain",
    fileName:        "OLLAMA.md",
    path:            "cmdino-preset://ollama",
    description:     "Local offline assistant role.",
    defaultSelected: true,
  },
];

export function getBrainById(id: PresetBrainId | string): PresetBrainFile | undefined {
  return PRESET_BRAINS.find((b) => b.id === id);
}

/** Build TerminalAttachment objects from a list of brain IDs. */
export function buildBrainAttachments(brainIds: (PresetBrainId | string)[]): TerminalAttachment[] {
  return brainIds
    .map((id) => getBrainById(id))
    .filter((b): b is PresetBrainFile => b !== undefined)
    .map((b) => ({
      id:       crypto.randomUUID(),
      path:     b.path,
      fileName: b.fileName,
      addedAt:  Date.now(),
      source:   "preset" as const,
    }));
}
