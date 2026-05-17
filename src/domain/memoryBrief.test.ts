import { describe, expect, it } from "vitest";
import type { GeneratedOutputFile } from "./attachments";
import { buildMemoryBriefs } from "./memoryBrief";
import type { SessionLogEvent } from "./sessionLog";
import type { TerminalAgent } from "./terminalAgent";
import type { WorkflowLink } from "./workflow";
import type { WorkflowRun } from "./workflowRun";

function agent(overrides: Partial<TerminalAgent> = {}): TerminalAgent {
  return {
    id: "agent-1",
    configId: "cfg-planner",
    label: "Planner",
    dinoId: "dino-1",
    launchCommand: "codex",
    cwd: "C:\\repo",
    agentKind: "codex",
    attachments: [
      {
        id: "att-1",
        path: "C:\\outputs\\CMDINO_PROJECT_MEMORY_BRIEF.md",
        fileName: "CMDINO_PROJECT_MEMORY_BRIEF.md",
        addedAt: 1,
        source: "generated",
      },
    ],
    ...overrides,
  };
}

function run(): WorkflowRun {
  return {
    id: "run-1",
    userTask: "Consolidate memory brief generation.",
    mode: "checkpoint",
    status: "waiting_for_user",
    currentStepId: "review",
    createdAt: Date.UTC(2026, 4, 17, 1, 0, 0),
    startedAt: Date.UTC(2026, 4, 17, 1, 5, 0),
    steps: [
      {
        id: "plan",
        label: "Planner",
        agentRole: "planner",
        status: "completed",
        parsedOutput: {
          status: "success",
          summary: "Mapped the memory brief sections.",
          artifacts: [],
          handoff: {
            target: "Builder",
            message: "Implement the project-level brief.",
          },
          next: ["Add tests for workflow state and artifact paths."],
        },
      },
      {
        id: "review",
        label: "Reviewer",
        agentRole: "reviewer",
        status: "waiting_for_approval",
      },
    ],
  };
}

function output(fileName: string, kind: GeneratedOutputFile["kind"]): GeneratedOutputFile {
  return {
    path: `C:\\outputs\\${fileName}`,
    fileName,
    kind,
    sizeBytes: 100,
    modifiedAt: 1,
  };
}

describe("buildMemoryBriefs", () => {
  it("builds one project memory brief with the required continuity sections", () => {
    const briefs = buildMemoryBriefs({
      workspaceName: "CMDino Build",
      agents: [agent()],
      workflowLinks: [],
      sessionEntries: [],
      currentRun: run(),
      outputFiles: [output("build-in-public-post_task.md", "markdown")],
      workflowArtifactPaths: ["workflow-final-output_task.md"],
      generatedAt: Date.UTC(2026, 4, 17, 2, 0, 0),
    });

    expect(briefs).toHaveLength(1);
    expect(briefs[0].kind).toBe("memory_brief");
    expect(briefs[0].fileName).toBe("CMDINO_BUILD_PROJECT_MEMORY_BRIEF.md");
    expect(briefs[0].content).toContain("## Project");
    expect(briefs[0].content).toContain("## Current Goal");
    expect(briefs[0].content).toContain("## Completed");
    expect(briefs[0].content).toContain("## Current Workflow State");
    expect(briefs[0].content).toContain("## Agent Outputs");
    expect(briefs[0].content).toContain("## Decisions");
    expect(briefs[0].content).toContain("## Known Issues");
    expect(briefs[0].content).toContain("## Next Recommended Prompt");
  });

  it("includes active workflow state and artifact paths", () => {
    const brief = buildMemoryBriefs({
      workspaceName: "CMDino Build",
      agents: [agent()],
      workflowLinks: [],
      sessionEntries: [],
      currentRun: run(),
      outputFiles: [output("build-in-public-post_task.md", "markdown")],
      workflowArtifactPaths: ["workflow-final-output_task.md"],
      generatedAt: Date.UTC(2026, 4, 17, 2, 0, 0),
    })[0].content;

    expect(brief).toContain("Run ID: run-1");
    expect(brief).toContain("Current step: Reviewer");
    expect(brief).toContain("workflow-final-output_task.md");
    expect(brief).toContain("C:\\outputs\\build-in-public-post_task.md");
  });

  it("captures decisions, known issues, and a next prompt", () => {
    const events: SessionLogEvent[] = [
      {
        id: "event-1",
        ts: Date.UTC(2026, 4, 17, 2, 0, 0),
        workspaceId: "workspace-1",
        agentConfigId: "cfg-planner",
        agentLabel: "Planner",
        type: "terminal_error",
        payload: {},
      },
    ];
    const links: WorkflowLink[] = [
      {
        id: "link-1",
        sourceConfigId: "cfg-planner",
        targetConfigId: "cfg-reviewer",
        kind: "route",
        count: 1,
        updatedAt: 1,
      },
    ];
    const brief = buildMemoryBriefs({
      workspaceName: "CMDino Build",
      agents: [agent(), agent({ id: "agent-2", configId: "cfg-reviewer", label: "Reviewer" })],
      workflowLinks: links,
      sessionEntries: events,
      currentRun: run(),
      generatedAt: Date.UTC(2026, 4, 17, 2, 0, 0),
    })[0].content;

    expect(brief).toContain("Planner handoff: Implement the project-level brief.");
    expect(brief).toContain("Planner -> Reviewer (route, count 1)");
    expect(brief).toContain("Planner: Terminal error");
    expect(brief).toContain("Continue the CMDino workflow for: Consolidate memory brief generation.");
  });
});
