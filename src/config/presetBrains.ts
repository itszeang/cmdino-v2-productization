import type { PresetBrainFile, PresetBrainId } from "../domain/presetBrain";
import type { TerminalAttachment } from "../domain/orchestration";

export const PRESET_BRAINS: PresetBrainFile[] = [
  {
    id:              "claude-planner-brain",
    title:           "Claude Planner Brain",
    fileName:        "claude-planner.md",
    path:            "cmdino-preset://claude-planner.md",
    description:     "Planning role — breaks requests into scoped implementation steps.",
    defaultSelected: true,
  },
  {
    id:              "codex-builder-brain",
    title:           "Codex Builder Brain",
    fileName:        "codex-builder.md",
    path:            "cmdino-preset://codex-builder.md",
    description:     "Implementation role — applies minimal, scoped patches from a plan.",
    defaultSelected: true,
  },
  {
    id:              "gemini-reviewer-brain",
    title:           "Gemini Reviewer Brain",
    fileName:        "gemini-reviewer.md",
    path:            "cmdino-preset://gemini-reviewer.md",
    description:     "Review role — flags risks, UX issues, and missing tests.",
    defaultSelected: true,
  },
  {
    id:              "ollama-worker-brain",
    title:           "Ollama Worker Brain",
    fileName:        "ollama-worker.md",
    path:            "cmdino-preset://ollama-worker.md",
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
