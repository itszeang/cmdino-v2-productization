import { describe, expect, it } from "vitest";
import { parseCmdinoResult } from "../orchestration/cmdinoResultParser";
import {
  canCaptureFromAgent,
  cleanCapturedWorkflowOutput,
  captureFailureMessage,
  extractStructuredWorkflowOutput,
  getWorkflowResultCaptureFailureReason,
  normalizeCapturedWorkflowResult,
  normalizeWorkflowResultCapture,
  stripAnsiControlSequences,
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
    const captured = normalizeCapturedWorkflowResult(`CMDINO_RESULT_START
{"status":"success","summary":"Done","artifacts":[],"handoff":{"target":"Reviewer","message":"Ready"},"next":[]}
CMDINO_RESULT_END\n\n`);

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
      rawCapturedOutput: "result",
      cleanedCapturedOutput: "result",
    });
  });

  it("strips ANSI escape and control sequences from cleaned capture output", () => {
    const raw = "\u001b[32mCMDINO_RESULT_START\u001b[0m\u0007\nbody\nCMDINO_RESULT_END";

    expect(stripAnsiControlSequences(raw)).toBe("CMDINO_RESULT_START\nbody\nCMDINO_RESULT_END");
    expect(cleanCapturedWorkflowOutput(`${raw}\n\n`)).toBe("CMDINO_RESULT_START\nbody\nCMDINO_RESULT_END");
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
    "CMDINO_RESULT_START",
    '{"status":"success","summary":"Built todo","artifacts":[],"handoff":{"target":"Reviewer","message":"Ready to review"},"next":[]}',
    "CMDINO_RESULT_END",
  ].join("\n");

  it("extracts only the structured result region", () => {
    const text = [NOISY, RESULT_BLOCK].join("\n");
    const result = extractStructuredWorkflowOutput(text);

    expect(result.validForParse).toBe(true);
    expect(result.structuredText).toContain("CMDINO_RESULT_START");
    expect(result.structuredText).toContain("CMDINO_RESULT_END");
    expect(result.structuredText).not.toContain("Microsoft Windows");
    expect(result.structuredText).not.toContain("Welcome back");
    expect(result.warning).toBeUndefined();
  });

  it("captures the last CMDINO_RESULT block", () => {
    const stale = [
      "CMDINO_RESULT_START",
      '{"status":"success","summary":"Stale","artifacts":[],"handoff":{"target":"Reviewer","message":"Old"},"next":[]}',
      "CMDINO_RESULT_END",
    ].join("\n");
    const latest = [
      "CMDINO_RESULT_START",
      '{"status":"success","summary":"Latest","artifacts":[],"handoff":{"target":"Reviewer","message":"New"},"next":[]}',
      "CMDINO_RESULT_END",
    ].join("\n");
    const result = extractStructuredWorkflowOutput([NOISY, stale, "more logs", latest].join("\n"));

    expect(result.validForParse).toBe(true);
    expect(result.structuredText).toContain('"summary":"Latest"');
    expect(result.structuredText).not.toContain('"summary":"Stale"');
  });

  it("ignores earlier stale CMDINO_RESULT blocks", () => {
    const text = [
      "CMDINO_RESULT_START",
      '{"status":"failed","summary":"Old failure","artifacts":[],"handoff":{"target":"User","message":"Old"},"next":[]}',
      "CMDINO_RESULT_END",
      "terminal output after retry",
      RESULT_BLOCK,
    ].join("\n");
    const result = extractStructuredWorkflowOutput(text);

    expect(result.structuredText).toContain('"summary":"Built todo"');
    expect(result.structuredText).not.toContain("Old failure");
  });

  it("returns validForParse true with warning for legacy result without legacy handoff", () => {
    const legacyResult = [
      "<CMDINO_RESULT>",
      '{"status":"completed","summary":"Built todo","handoff":"Ready to review","needs_user_action":false}',
      "</CMDINO_RESULT>",
    ].join("\n");
    const text = [NOISY, legacyResult].join("\n");
    const result = extractStructuredWorkflowOutput(text);

    expect(result.validForParse).toBe(true);
    expect(result.structuredText).toContain("<CMDINO_RESULT>");
    expect(result.structuredText).not.toContain("<CMDINO_HANDOFF>");
    expect(result.warning).toContain("missing CMDINO_HANDOFF");
  });

  it("returns validForParse false when no CMDINO_RESULT present", () => {
    const result = extractStructuredWorkflowOutput(`\u001b[31m${NOISY}\u001b[0m`);

    expect(result.validForParse).toBe(false);
    expect(result.structuredText).toBe(NOISY);
    expect(result.cleanedCapturedOutput).toBe(NOISY);
    expect(result.rawCapturedOutput).toContain("\u001b[31m");
    expect(result.warning).toContain("missing CMDINO_RESULT_START");
  });

  it("preserves the raw text in all cases", () => {
    const text = [NOISY, RESULT_BLOCK].join("\n");
    expect(extractStructuredWorkflowOutput(text).rawText).toBe(text);
    expect(extractStructuredWorkflowOutput(NOISY).rawText).toBe(NOISY);
  });
});
