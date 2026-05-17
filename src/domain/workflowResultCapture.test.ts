import { describe, expect, it } from "vitest";
import { parseCmdinoResult } from "../orchestration/cmdinoResultParser";
import {
  canCaptureFromAgent,
  captureFailureMessage,
  extractStructuredWorkflowOutput,
  getWorkflowResultCaptureFailureReason,
  normalizeCapturedWorkflowResult,
  normalizeWorkflowResultCapture,
} from "./workflowResultCapture";

describe("workflowResultCapture", () => {
  it("allows capture only with a selected running agent and registered capture getter", () => {
    expect(canCaptureFromAgent({
      agentId: "agent-1",
      isRunning: true,
      hasCaptureGetter: true,
    })).toBe(true);

    expect(canCaptureFromAgent({
      agentId: "agent-1",
      isRunning: false,
      hasCaptureGetter: true,
    })).toBe(false);
  });

  it("explains missing capture prerequisites", () => {
    expect(getWorkflowResultCaptureFailureReason({})).toBe("missing_target");
    expect(getWorkflowResultCaptureFailureReason({
      agentId: "agent-1",
      isRunning: false,
      hasCaptureGetter: true,
    })).toBe("target_not_running");
    expect(getWorkflowResultCaptureFailureReason({
      agentId: "agent-1",
      isRunning: true,
      hasCaptureGetter: false,
    })).toBe("capture_unavailable");
  });

  it("returns user-facing failure copy", () => {
    expect(captureFailureMessage("missing_target")).toContain("No target agent selected");
    expect(captureFailureMessage("no_output", "Codex Builder")).toContain("Codex Builder");
  });

  it("keeps captured parser input unchanged except trailing whitespace", () => {
    const captured = normalizeCapturedWorkflowResult(`<CMDINO_RESULT>
{"status":"completed","summary":"Done","handoff":"Ready","needs_user_action":false}
</CMDINO_RESULT>\n\n`);

    const parsed = parseCmdinoResult(captured);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.result.summary).toBe("Done");
    }
  });

  it("preserves capture source while trimming trailing whitespace", () => {
    expect(normalizeWorkflowResultCapture({
      source: "selected_text",
      text: "result\n\n",
    })).toEqual({
      source: "selected_text",
      text: "result",
    });
  });
});

describe("extractStructuredWorkflowOutput", () => {
  const NOISY = [
    "Microsoft Windows [Version 10.0.26200.8246]",
    "Welcome back zeang!",
    "Sonnet 4.6...",
    "thinking...",
    "Reading task instructions...",
    "Plan: Tiny Todo Component",
  ].join("\n");

  const RESULT_BLOCK = [
    "<CMDINO_RESULT>",
    '{"status":"completed","summary":"Built todo","handoff":"Ready to review","needs_user_action":false}',
    "</CMDINO_RESULT>",
  ].join("\n");

  const HANDOFF_BLOCK = [
    "<CMDINO_HANDOFF>",
    "Ready to review the tiny todo component.",
    "</CMDINO_HANDOFF>",
  ].join("\n");

  it("extracts only the structured region when both blocks are present", () => {
    const text = [NOISY, RESULT_BLOCK, HANDOFF_BLOCK].join("\n");
    const result = extractStructuredWorkflowOutput(text);

    expect(result.validForParse).toBe(true);
    expect(result.structuredText).toContain("<CMDINO_RESULT>");
    expect(result.structuredText).toContain("</CMDINO_HANDOFF>");
    expect(result.structuredText).not.toContain("Microsoft Windows");
    expect(result.structuredText).not.toContain("Welcome back");
    expect(result.warning).toBeUndefined();
  });

  it("returns validForParse true with warning when CMDINO_RESULT present but CMDINO_HANDOFF absent", () => {
    const text = [NOISY, RESULT_BLOCK].join("\n");
    const result = extractStructuredWorkflowOutput(text);

    expect(result.validForParse).toBe(true);
    expect(result.structuredText).toContain("<CMDINO_RESULT>");
    expect(result.structuredText).not.toContain("<CMDINO_HANDOFF>");
    expect(result.warning).toContain("missing CMDINO_HANDOFF");
  });

  it("returns validForParse false when no CMDINO_RESULT present", () => {
    const result = extractStructuredWorkflowOutput(NOISY);

    expect(result.validForParse).toBe(false);
    expect(result.structuredText).toBe("");
    expect(result.warning).toContain("missing CMDINO_RESULT");
    expect(result.rawText).toBe(NOISY);
  });

  it("preserves the raw text in all cases", () => {
    const text = [NOISY, RESULT_BLOCK].join("\n");
    expect(extractStructuredWorkflowOutput(text).rawText).toBe(text);
    expect(extractStructuredWorkflowOutput(NOISY).rawText).toBe(NOISY);
  });
});
