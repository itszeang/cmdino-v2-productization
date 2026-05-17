import { describe, expect, it } from "vitest";
import {
  HANDOFF_END,
  HANDOFF_START,
  buildHandoffMarkerInstruction,
  extractHandoffText,
  extractReviewSendText,
} from "./handoffProtocol";

describe("extractHandoffText", () => {
  it("extracts explicit handoff markers without surrounding noise", () => {
    const result = extractHandoffText([
      "welcome banner",
      "<CMDINO_HANDOFF>",
      "Send only this.",
      "</CMDINO_HANDOFF>",
      "shell prompt",
    ].join("\n"));

    expect(result).toEqual({
      text: "Send only this.",
      source: "handoff_marker",
    });
  });

  it("falls back to CMDINO_RESULT handoff", () => {
    const result = extractHandoffText([
      "<CMDINO_RESULT>",
      JSON.stringify({
        status: "completed",
        summary: "done",
        handoff: "Use this next.",
        needs_user_action: false,
      }),
      "</CMDINO_RESULT>",
    ].join("\n"));

    expect(result).toEqual({
      text: "Use this next.",
      source: "cmdino_result",
    });
  });

  it("does not return noisy unmarked output", () => {
    expect(extractHandoffText("terminal banner\nrandom logs").source).toBe("none");
  });

  it("uses explicitly selected text after marked outputs are absent", () => {
    const result = extractReviewSendText({
      outputText: "terminal banner\nrandom logs",
      selectedText: "Use this selected handoff.",
    });

    expect(result).toEqual({
      text: "Use this selected handoff.",
      source: "selected_text",
    });
  });

  it("refuses noisy unmarked output when no selected text is provided", () => {
    expect(extractReviewSendText({ outputText: "terminal banner\nrandom logs" })).toEqual({
      text: "",
      source: "none",
    });
  });

  it("builds exactly one CMDINO_HANDOFF section instruction", () => {
    const instruction = buildHandoffMarkerInstruction();

    expect(instruction.split(HANDOFF_START)).toHaveLength(2);
    expect(instruction.split(HANDOFF_END)).toHaveLength(2);
    expect(instruction).toContain("exactly one CMDINO_HANDOFF instruction section");
    expect(instruction).toContain("Do not include terminal banners, logs, prompts, or unrelated output.");
  });
});
