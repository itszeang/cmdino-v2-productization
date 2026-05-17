import { describe, expect, it } from "vitest";
import { suggestTargetAgentForStep } from "./agentTargetSuggestion";

describe("agentTargetSuggestion", () => {
  it("prefers a running agent with matching provider kind", () => {
    expect(suggestTargetAgentForStep({
      preferredProvider: "codex",
      role: "builder",
      agents: [
        { id: "claude", label: "Claude Planner", kind: "claude", isRunning: true },
        { id: "codex", label: "Codex Builder", kind: "codex", isRunning: true },
      ],
    })).toBe("codex");
  });

  it("does not bind a provider-only match to the wrong workflow role", () => {
    expect(suggestTargetAgentForStep({
      preferredProvider: "claude",
      role: "architect",
      agents: [
        { id: "claude-planner", label: "Claude Planner", kind: "claude", isRunning: true },
        { id: "codex-builder", label: "Codex Builder", kind: "codex", isRunning: true },
      ],
    })).toBeNull();
  });

  it("ignores non-running provider matches", () => {
    expect(suggestTargetAgentForStep({
      preferredProvider: "gemini",
      role: "reviewer",
      agents: [
        { id: "gemini", label: "Gemini Reviewer", kind: "gemini", isRunning: false },
        { id: "reviewer", label: "Review Agent", kind: "custom", isRunning: true },
      ],
    })).toBe("reviewer");
  });

  it("returns null when there is no useful suggestion", () => {
    expect(suggestTargetAgentForStep({
      preferredProvider: "ollama",
      role: "summarizer",
      agents: [
        { id: "custom", label: "Local Helper", kind: "custom", isRunning: true },
      ],
    })).toBeNull();
  });
});
