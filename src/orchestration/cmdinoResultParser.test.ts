import { describe, expect, it } from "vitest";
import { hasCmdinoResultBlock, parseCmdinoResult } from "./cmdinoResultParser";

function block(json: string): string {
  return `<CMDINO_RESULT>\n${json}\n</CMDINO_RESULT>`;
}

describe("cmdinoResultParser", () => {
  it("parses a valid completed block", () => {
    const parsed = parseCmdinoResult(block(JSON.stringify({
      status: "completed",
      summary: "Built the UI shell.",
      handoff: "Review the UI next.",
      needs_user_action: false,
      user_action_reason: "",
      next_agent_instruction: "Check accessibility.",
    })));

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.result.status).toBe("completed");
      expect(parsed.result.summary).toBe("Built the UI shell.");
      expect(parsed.result.needsUserAction).toBe(false);
      expect(parsed.result.nextAgentInstruction).toBe("Check accessibility.");
    }
  });

  it("parses a valid needs_user_action block", () => {
    const parsed = parseCmdinoResult(block(JSON.stringify({
      status: "needs_user_action",
      summary: "Permission prompt blocked the run.",
      handoff: "",
      needs_user_action: true,
      user_action_reason: "Codex requested file write permission.",
    })));

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.result.status).toBe("needs_user_action");
      expect(parsed.result.needsUserAction).toBe(true);
      expect(parsed.result.userActionReason).toContain("permission");
    }
  });

  it("fails safely when the block is missing", () => {
    const parsed = parseCmdinoResult("No structured result here.");

    expect(hasCmdinoResultBlock("No structured result here.")).toBe(false);
    expect(parsed).toEqual({ ok: false, reason: "missing_block" });
  });

  it("fails safely on invalid JSON", () => {
    const parsed = parseCmdinoResult(block("{not-json"));

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.reason).toBe("invalid_json");
  });

  it("fails safely on invalid shape", () => {
    const parsed = parseCmdinoResult(block(JSON.stringify({
      status: "done",
      summary: "Bad status.",
    })));

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.reason).toBe("invalid_shape");
  });

  it("supports extra text before and after the result block", () => {
    const parsed = parseCmdinoResult(`Here is the work.\n${block(JSON.stringify({
      status: "completed",
      summary: "Finished.",
      handoff: "Next.",
      needs_user_action: false,
    }))}\nThanks.`);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.result.summary).toBe("Finished.");
  });
});

