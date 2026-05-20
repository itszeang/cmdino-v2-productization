import { describe, it, expect } from "vitest";
import { detectInteractionInOutput } from "./interactionDetector";

describe("detectInteractionInOutput", () => {

  // ── Approval prompts ─────────────────────────────────────────────────────────

  it("detects 'allow once' approval pattern", () => {
    const output = "Claude wants to run a shell command.\n> 1) Allow Once\n> 2) Always Allow\n> 3) Deny";
    const result = detectInteractionInOutput(output);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("approval");
    expect(result!.suggestedActions.map((a) => a.label)).toContain("Allow Once");
    expect(result!.suggestedActions.map((a) => a.label)).toContain("Always Allow");
    expect(result!.suggestedActions.map((a) => a.label)).toContain("Deny");
  });

  it("detects 'always allow' phrase", () => {
    const output = "Permission: always allow this action?";
    const result = detectInteractionInOutput(output);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("approval");
  });

  // ── Yes/No prompts ───────────────────────────────────────────────────────────

  it("detects [y/N] yes/no prompt", () => {
    const output = "This will overwrite the file. Continue? [y/N]";
    const result = detectInteractionInOutput(output);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("yes_no");
    expect(result!.suggestedActions.map((a) => a.value)).toContain("y");
    expect(result!.suggestedActions.map((a) => a.value)).toContain("n");
  });

  it("detects [Y/n] yes/no prompt", () => {
    const output = "Install 3 new packages? [Y/n]";
    const result = detectInteractionInOutput(output);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("yes_no");
  });

  it("detects (y/n) paren-style yes/no prompt", () => {
    const output = "Apply these changes? (y/n)";
    const result = detectInteractionInOutput(output);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("yes_no");
  });

  it("detects 'proceed? [y/N]' combined prompt", () => {
    const output = "Deploy to production. Proceed? [y/N]";
    const result = detectInteractionInOutput(output);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("yes_no");
  });

  // ── Enter to continue ────────────────────────────────────────────────────────

  it("detects 'press enter to continue'", () => {
    const output = "Setup complete. Press enter to continue";
    const result = detectInteractionInOutput(output);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("enter_to_continue");
    expect(result!.suggestedActions[0]?.value).toBe("");
    expect(result!.suggestedActions[0]?.label).toBe("Press Enter");
  });

  it("detects 'press any key to continue'", () => {
    const output = "Installation finished.\nPress any key to continue";
    const result = detectInteractionInOutput(output);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("enter_to_continue");
  });

  // ── False positive guards ────────────────────────────────────────────────────

  it("does not flag normal code with deny/allow keywords", () => {
    const output = `
      function denyAccess(user) {
        return user.role !== "admin";
      }
      const policy = "allow all requests";
      console.log("yes no maybe");
    `;
    expect(detectInteractionInOutput(output)).toBeNull();
  });

  it("does not flag auth config mention of 'deny'", () => {
    const output = "Auth policy: deny all requests without a valid token\nProcessing complete.";
    // "deny" alone without "allow once" / "always allow" context should not match
    expect(detectInteractionInOutput(output)).toBeNull();
  });

  it("does not flag a progress log line containing 'continue'", () => {
    const output = "Processing file 3 of 10... continue processing remaining items.";
    expect(detectInteractionInOutput(output)).toBeNull();
  });

  it("does not match bare 'y/n' without bracket or paren context", () => {
    const output = "The answer could be y or n depending on context.";
    expect(detectInteractionInOutput(output)).toBeNull();
  });

  // ── Routing / excerpt ────────────────────────────────────────────────────────

  it("returns an excerpt for every detected interaction", () => {
    const output = "Claude wants to use bash. Allow? [y/N]";
    const result = detectInteractionInOutput(output);
    expect(result).not.toBeNull();
    expect(result!.excerpt.length).toBeGreaterThan(0);
    expect(result!.excerpt.length).toBeLessThanOrEqual(220);
  });

  it("only scans the tail of large output buffers", () => {
    const filler = "Processing data line by line...\n".repeat(300);
    const prompt  = filler + "Ready to deploy. Proceed? [y/N]";
    const result  = detectInteractionInOutput(prompt);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("yes_no");
  });

  it("returns null for empty or whitespace output", () => {
    expect(detectInteractionInOutput("")).toBeNull();
    expect(detectInteractionInOutput("   \n  ")).toBeNull();
  });

});

describe("interaction routing invariants", () => {
  it("routes response values correctly for yes_no", () => {
    const result = detectInteractionInOutput("Overwrite existing file? [y/N]");
    expect(result).not.toBeNull();
    const yesAction = result!.suggestedActions.find((a) => a.label === "Yes");
    const noAction  = result!.suggestedActions.find((a) => a.label === "No");
    expect(yesAction?.value).toBe("y");
    expect(noAction?.value).toBe("n");
  });

  it("routes response values correctly for enter_to_continue", () => {
    const result = detectInteractionInOutput("Press enter to continue");
    expect(result).not.toBeNull();
    const enterAction = result!.suggestedActions.find((a) => a.label === "Press Enter");
    expect(enterAction?.value).toBe("");
  });

  it("approval responses are non-empty strings (numbered options)", () => {
    const result = detectInteractionInOutput("1) Allow Once\n2) Always Allow\n3) Deny");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("approval");
    result!.suggestedActions.forEach((action) => {
      expect(action.value.trim().length).toBeGreaterThan(0);
    });
  });
});
