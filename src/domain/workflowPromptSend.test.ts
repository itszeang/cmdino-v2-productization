import { describe, expect, it } from "vitest";
import type { TerminalAgent } from "./terminalAgent";
import type { WorkflowRun } from "./workflowRun";
import {
  buildWorkflowPromptAgentTargets,
  ensurePromptSubmitText,
  markCurrentWorkflowStepPromptSent,
  detectCwdMismatch,
  buildTerminalSubmitPayload,
  buildTerminalSubmitLine,
  buildPromptFileInstruction,
  buildWorkflowResultCorrectionInstruction,
  buildWorkflowRecoveryPrompt,
  getTerminalSubmitStrategy,
} from "./workflowPromptSend";

const agents: TerminalAgent[] = [
  {
    id: "agent-1",
    configId: "config-1",
    label: "Claude Planner",
    dinoId: "blue",
    attachments: [],
  },
  {
    id: "agent-2",
    configId: "config-2",
    label: "Codex Builder",
    dinoId: "green",
    attachments: [],
  },
];

function makeRun(): WorkflowRun {
  return {
    id: "run-1",
    userTask: "Build workflow send.",
    mode: "checkpoint",
    status: "waiting_for_user",
    currentStepId: "planner",
    steps: [
      {
        id: "planner",
        label: "Product Planner",
        agentRole: "planner",
        status: "waiting_for_approval",
      },
      {
        id: "builder",
        label: "Builder",
        agentRole: "builder",
        status: "pending",
      },
    ],
    createdAt: 1,
    startedAt: 1,
  };
}

describe("workflowPromptSend", () => {
  it("marks running and dormant target agents", () => {
    const targets = buildWorkflowPromptAgentTargets(
      agents,
      new Set(["agent-1"]),
      { "agent-1": "running", "agent-2": "dormant" },
    );

    expect(targets).toEqual([
      { id: "agent-1", label: "Claude Planner", isRunning: true, lifecycle: "running", kind: undefined, isSuggested: false },
      { id: "agent-2", label: "Codex Builder", isRunning: false, lifecycle: "dormant", kind: undefined, isSuggested: false },
    ]);
  });

  it("formats sent prompt text like an explicit terminal submit", () => {
    expect(ensurePromptSubmitText("hello\nworld\n\n")).toBe("hello world\r\n");
  });

  it("updates the current step after explicit prompt send", () => {
    const next = markCurrentWorkflowStepPromptSent(makeRun(), {
      agentId: "agent-1",
      prompt: "Step prompt",
      sentAt: 123,
    });

    expect(next.status).toBe("running");
    expect(next.steps[0]).toMatchObject({
      status: "running",
      agentId: "agent-1",
      input: "Step prompt",
      startedAt: 123,
    });
    expect(next.steps[1].status).toBe("pending");
  });

  describe("detectCwdMismatch", () => {
    it("returns false when both values are absent", () => {
      expect(detectCwdMismatch(undefined, undefined)).toBe(false);
      expect(detectCwdMismatch(undefined, "C:\\project")).toBe(false);
      expect(detectCwdMismatch("C:\\project", undefined)).toBe(false);
    });

    it("returns false when cwd matches project path", () => {
      expect(detectCwdMismatch("C:\\project", "C:\\project")).toBe(false);
    });

    it("is case-insensitive", () => {
      expect(detectCwdMismatch("C:\\Project", "C:\\project")).toBe(false);
    });

    it("ignores trailing slashes", () => {
      expect(detectCwdMismatch("C:\\project\\", "C:\\project")).toBe(false);
      expect(detectCwdMismatch("C:\\project", "C:\\project\\")).toBe(false);
    });

    it("returns true when cwd differs from project path", () => {
      expect(detectCwdMismatch("C:\\Users\\burak", "C:\\Users\\burak\\deneme")).toBe(true);
    });
  });

  describe("buildTerminalSubmitPayload", () => {
    it("appends CRLF for reliable Windows ConPTY submission", () => {
      expect(buildTerminalSubmitPayload("hello")).toBe("hello\r\n");
    });

    it("collapses embedded newlines into spaces to keep instruction single-line", () => {
      const result = buildTerminalSubmitPayload("line one\nline two\r\nline three");
      expect(result).toBe("line one line two line three\r\n");
    });

    it("trims trailing whitespace before appending CRLF", () => {
      expect(buildTerminalSubmitPayload("hello   ")).toBe("hello\r\n");
    });

    it("produces no embedded CR or LF before the trailing CRLF", () => {
      const result = buildTerminalSubmitPayload("some text");
      const body = result.slice(0, -2);
      expect(body.includes("\r")).toBe(false);
      expect(body.includes("\n")).toBe(false);
    });
  });

  describe("buildTerminalSubmitLine", () => {
    it("returns text without terminal submit bytes", () => {
      expect(buildTerminalSubmitLine("line one\nline two\r\n")).toBe("line one line two");
    });
  });

  describe("buildPromptFileInstruction", () => {
    it("does not include submit bytes because Enter is written separately", () => {
      const instr = buildPromptFileInstruction("C:\\project\\.cmdino\\runs\\r1\\s1-prompt.md");
      expect(instr.endsWith("\r")).toBe(false);
      expect(instr.endsWith("\n")).toBe(false);
    });

    it("contains no embedded newlines", () => {
      const instr = buildPromptFileInstruction("C:\\project\\.cmdino\\runs\\r1\\s1-prompt.md");
      expect(instr.includes("\n")).toBe(false);
      expect(instr.includes("\r")).toBe(false);
    });

    it("embeds the file path in the instruction", () => {
      const path = "C:\\project\\.cmdino\\runs\\r1\\s1-prompt.md";
      expect(buildPromptFileInstruction(path)).toContain(path);
    });

    it("requires the structured workflow result block", () => {
      const instruction = buildPromptFileInstruction("C:\\project\\.cmdino\\runs\\r1\\s1-prompt.md");
      expect(instruction).toContain("Do not repeat or echo the file");
      expect(instruction).toContain("Treat it as your task instructions");
      expect(instruction).toContain("exactly one CMDINO_RESULT_START / CMDINO_RESULT_END block");
      expect(instruction).toContain("Do not stop without it.");
    });
  });

  describe("buildWorkflowResultCorrectionInstruction", () => {
    it("asks the agent to finish with the required result block", () => {
      const instruction = buildWorkflowResultCorrectionInstruction();
      expect(instruction).toContain("previous response is incomplete");
      expect(instruction).toContain("exactly one CMDINO_RESULT_START / CMDINO_RESULT_END block");
      expect(instruction.includes("\r")).toBe(false);
      expect(instruction.includes("\n")).toBe(false);
    });

    it("tells agent not to redo the task", () => {
      expect(buildWorkflowResultCorrectionInstruction()).toContain("Do not redo the task");
    });

    it("stays single-line for terminal submit", () => {
      const instruction = buildWorkflowResultCorrectionInstruction();
      expect(instruction.includes("\n")).toBe(false);
      expect(instruction.includes("\r")).toBe(false);
    });
  });

  describe("buildWorkflowRecoveryPrompt", () => {
    it("says do not redo the task", () => {
      expect(buildWorkflowRecoveryPrompt()).toContain("Do not redo the task.");
    });

    it("says reply ONLY with the structured result block", () => {
      const prompt = buildWorkflowRecoveryPrompt();
      expect(prompt).toContain("Reply ONLY with exactly one CMDINO_RESULT_START / CMDINO_RESULT_END block");
    });

    it("includes the exact CMDINO_RESULT schema", () => {
      const prompt = buildWorkflowRecoveryPrompt();
      expect(prompt).toContain("CMDINO_RESULT_START");
      expect(prompt).toContain("CMDINO_RESULT_END");
      expect(prompt).toContain('"status": "success"');
      expect(prompt).toContain('"summary"');
      expect(prompt).toContain('"artifacts"');
      expect(prompt).toContain('"handoff"');
      expect(prompt).toContain('"next"');
      expect(prompt).toContain('Allowed status values: "success", "needs_user_action", "failed".');
    });

    it("does not say redo or repeat the full explanation", () => {
      const prompt = buildWorkflowRecoveryPrompt();
      expect(prompt).toContain("Do not repeat the full explanation.");
      expect(prompt).toContain("Do not continue implementation.");
    });
  });

  describe("getTerminalSubmitStrategy", () => {
    it("uses delayed carriage return for Claude Code", () => {
      expect(getTerminalSubmitStrategy("claude")).toEqual({ enterSequence: "\r", delayMs: 120 });
    });

    it("keeps carriage return as the default interactive terminal Enter byte", () => {
      expect(getTerminalSubmitStrategy("custom")).toEqual({ enterSequence: "\r", delayMs: 90 });
    });
  });
});
