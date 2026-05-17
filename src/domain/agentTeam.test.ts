import { describe, expect, it } from "vitest";
import { DEFAULT_AGENT_TEAMS, workflowStepsFromAgentTeam, workspaceFromAgentTeam } from "./agentTeam";

describe("agentTeam presets", () => {
  it("includes the product workflow presets", () => {
    expect(DEFAULT_AGENT_TEAMS.map((team) => team.name)).toEqual([
      "Vibe App Builder",
      "Bug Fix Team",
      "UI Polish Team",
      "Architecture Team",
    ]);
  });

  it("marks Vibe App Builder as the recommended default", () => {
    const recommended = DEFAULT_AGENT_TEAMS.find((team) => team.recommended);

    expect(recommended?.id).toBe("vibe-app-builder");
    expect(recommended?.category).toBe("build");
  });

  it("has readable descriptions and usable steps for each team", () => {
    for (const team of DEFAULT_AGENT_TEAMS) {
      expect(team.description.length).toBeGreaterThan(20);
      expect(team.steps.length).toBeGreaterThanOrEqual(3);
      expect(team.steps.every((step) => step.label && step.role && step.preferredProvider)).toBe(true);
    }
  });

  it("maps selected team steps into workflow runner input", () => {
    const bugFixTeam = DEFAULT_AGENT_TEAMS.find((team) => team.id === "bug-fix-team");

    expect(bugFixTeam).toBeDefined();
    expect(workflowStepsFromAgentTeam(bugFixTeam!)).toEqual([
      {
        id: "bug-fix-analyze",
        label: "Bug Analyzer",
        agentRole: "reviewer",
        preferredProvider: "gemini",
      },
      {
        id: "bug-fix-build",
        label: "Fix Builder",
        agentRole: "builder",
        preferredProvider: "codex",
      },
      {
        id: "bug-fix-test-review",
        label: "Test Reviewer",
        agentRole: "tester",
        preferredProvider: "gemini",
      },
      {
        id: "bug-fix-summary",
        label: "Summarizer",
        agentRole: "summarizer",
        preferredProvider: "claude",
      },
    ]);
  });

  it("builds an Agent Workspace config from the same selected team", () => {
    const team = DEFAULT_AGENT_TEAMS.find((item) => item.id === "vibe-app-builder");

    expect(team).toBeDefined();
    const workspace = workspaceFromAgentTeam(team!);

    expect(workspace.workspaceName).toBe("Vibe App Builder");
    expect(workspace.terminals).toHaveLength(team!.steps.length);
    expect(workspace.workflowLinks).toHaveLength(team!.steps.length - 1);
    expect(workspace.terminals[0]).toMatchObject({
      label: "Claude Product Planner",
      agentKind: "claude",
      launchCommand: "claude",
    });
    expect(workspace.terminals[1]).toMatchObject({
      label: "Codex Builder",
      agentKind: "codex",
      launchCommand: "codex",
    });
  });
});
