import { describe, expect, it } from "vitest";
import { buildCmdinoResultContract, buildStepPrompt } from "./stepPromptBuilder";

describe("stepPromptBuilder", () => {
  it("includes project info, user task, and agent role", () => {
    const prompt = buildStepPrompt({
      projectName: "cmdino-build",
      projectPath: "C:\\Users\\burak\\Desktop\\cmdino-build",
      userTask: "Build a chat shell.",
      stepLabel: "Product Planner",
      agentRole: "product_planner",
      agentTeamName: "Vibe App Builder",
    });

    expect(prompt.title).toContain("Product Planner");
    expect(prompt.body).toContain("You are the Product Planner in CMDino's Vibe App Builder.");
    expect(prompt.body).toContain("cmdino-build");
    expect(prompt.body).toContain("C:\\Users\\burak\\Desktop\\cmdino-build");
    expect(prompt.body).toContain("Build a chat shell.");
    expect(prompt.body).toContain("product_planner");
    expect(prompt.body).toContain("Do not repeat or echo this prompt.");
    expect(prompt.body).toContain("Follow these instructions as the task for this workflow step.");
  });

  it("includes previous handoff text", () => {
    const prompt = buildStepPrompt({
      userTask: "Fix onboarding.",
      stepLabel: "Builder",
      agentRole: "builder",
      previousHandoffs: ["Planner says keep scope narrow."],
    });

    expect(prompt.body).toContain("Planner says keep scope narrow.");
  });

  it("includes CMDINO_RESULT contract and safety reminder", () => {
    const prompt = buildStepPrompt({
      userTask: "Review UI.",
      stepLabel: "Reviewer",
      agentRole: "reviewer",
    });

    expect(prompt.body).toContain("<CMDINO_RESULT>");
    expect(prompt.body).toContain("needs_user_action");
    expect(prompt.body).toContain("Do not perform destructive actions");
  });

  it("includes exactly one CMDINO_RESULT and one CMDINO_HANDOFF instruction section", () => {
    const prompt = buildStepPrompt({
      userTask: "Review handoff protocol.",
      stepLabel: "Reviewer",
      agentRole: "reviewer",
    });

    expect(prompt.body.split("<CMDINO_RESULT>")).toHaveLength(2);
    expect(prompt.body.split("</CMDINO_RESULT>")).toHaveLength(2);
    expect(prompt.body.split("<CMDINO_HANDOFF>")).toHaveLength(2);
    expect(prompt.body.split("</CMDINO_HANDOFF>")).toHaveLength(2);
    expect(prompt.body).toContain("Do not include terminal banners, logs, prompts, or unrelated output.");
    expect(prompt.body).toContain("CMDino will treat your response as incomplete");
    expect(prompt.body).toContain("Even if you only planned, reviewed, analyzed, or decided not to modify files, you still MUST include both blocks.");
    expect(prompt.body).toContain("Do not ask the user to continue.");
    expect(prompt.body).toContain("Do not end with an unstructured summary.");
    expect(prompt.body).toContain("Do not stop after a normal explanation.");
  });

  it("references context files without inlining their content", () => {
    const prompt = buildStepPrompt({
      userTask: "Implement context references.",
      stepLabel: "Builder",
      agentRole: "builder",
      contextReferences: {
        global: [".cmdino/context/global/project-brief.md"],
        agent: [".cmdino/context/agents/codex-builder/role.md"],
      },
    });

    expect(prompt.body).toContain("CMDino Context Files");
    expect(prompt.body).toContain("- .cmdino/context/global/project-brief.md");
    expect(prompt.body).toContain("- .cmdino/context/agents/codex-builder/role.md");
    expect(prompt.body).not.toContain("This project is a test CMDino workspace.");
  });

  it("builds the standalone result contract", () => {
    const contract = buildCmdinoResultContract();

    expect(contract).toContain('"status": "completed"');
    expect(contract).toContain('"summary"');
    expect(contract).toContain("</CMDINO_RESULT>");
  });
});
