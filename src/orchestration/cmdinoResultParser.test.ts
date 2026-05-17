import { describe, expect, it } from "vitest";
import { hasCmdinoResultBlock, parseCmdinoResult } from "./cmdinoResultParser";

function block(json: string): string {
  return `CMDINO_RESULT_START\n${json}\nCMDINO_RESULT_END`;
}

describe("cmdinoResultParser", () => {
  it("parses a valid success block", () => {
    const parsed = parseCmdinoResult(block(JSON.stringify({
      status: "success",
      summary: "Built the UI shell.",
      artifacts: [
        { type: "file", path: "src/App.tsx", description: "Updated shell." },
      ],
      handoff: { target: "Reviewer", message: "Review the UI next." },
      next: ["Check accessibility."],
    })));

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.result.status).toBe("success");
      expect(parsed.result.summary).toBe("Built the UI shell.");
      expect(parsed.result.needsUserAction).toBe(false);
      expect(parsed.result.artifacts[0]).toMatchObject({ type: "file", path: "src/App.tsx" });
      expect(parsed.result.handoff.message).toBe("Review the UI next.");
      expect(parsed.result.next).toEqual(["Check accessibility."]);
    }
  });

  it("parses a valid needs_user_action block", () => {
    const parsed = parseCmdinoResult(block(JSON.stringify({
      status: "needs_user_action",
      summary: "Permission prompt blocked the run.",
      artifacts: [],
      handoff: { target: "User", message: "Codex requested file write permission." },
      next: ["Approve or deny the write request."],
    })));

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.result.status).toBe("needs_user_action");
      expect(parsed.result.needsUserAction).toBe(true);
      expect(parsed.result.handoff.message).toContain("permission");
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
      status: "success",
      summary: "Finished.",
      artifacts: [],
      handoff: { target: "User", message: "Next." },
      next: [],
    }))}\nThanks.`);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.result.summary).toBe("Finished.");
  });

  it("parses the last CMDINO_RESULT block when stale blocks are present", () => {
    const stale = block(JSON.stringify({
      status: "failed",
      summary: "Stale failure.",
      artifacts: [],
      handoff: { target: "User", message: "Ignore this." },
      next: [],
    }));
    const latest = block(JSON.stringify({
      status: "success",
      summary: "Latest result.",
      artifacts: [],
      handoff: { target: "Reviewer", message: "Use this one." },
      next: [],
    }));

    const parsed = parseCmdinoResult([stale, "retry logs", latest].join("\n"));

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.result.summary).toBe("Latest result.");
      expect(parsed.result.handoff.message).toBe("Use this one.");
    }
  });

  it("normalizes legacy completed CMDINO_RESULT blocks for older captured output", () => {
    const parsed = parseCmdinoResult(`<CMDINO_RESULT>
${JSON.stringify({
  status: "completed",
  summary: "Legacy output.",
  handoff: "Legacy handoff.",
  needs_user_action: false,
})}
</CMDINO_RESULT>`);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.result.status).toBe("success");
      expect(parsed.result.handoff.message).toBe("Legacy handoff.");
    }
  });
});
