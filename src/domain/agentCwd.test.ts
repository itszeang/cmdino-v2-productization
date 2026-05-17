import { describe, expect, it } from "vitest";
import type { CmdinoWorkspaceFile } from "./workspace";
import {
  detectCwdMismatch,
  getAgentCwdHealth,
  resolveAgentCwd,
  resolveWorkspaceAgentCwds,
} from "./agentCwd";

const PROJECT_A = "C:\\Users\\burak\\OneDrive\\Desktop\\project-a";
const PROJECT_B = "C:\\Users\\burak\\OneDrive\\Desktop\\project-b";
const FALLBACK = "C:\\Users\\burak";

describe("agentCwd", () => {
  it("uses selected project root for default agent cwd", () => {
    expect(resolveAgentCwd({
      selectedProjectRoot: PROJECT_A,
      fallbackCwd: FALLBACK,
    })).toEqual({
      cwd: PROJECT_A,
      source: "project",
    });
  });

  it("allows a manual cwd override and warns when it differs from the project", () => {
    const result = resolveAgentCwd({
      selectedProjectRoot: PROJECT_A,
      requestedCwd: "C:\\tmp",
      fallbackCwd: FALLBACK,
    });

    expect(result.cwd).toBe("C:\\tmp");
    expect(result.source).toBe("requested");
    expect(result.warning).toContain("instead of the selected project folder");
  });

  it("uses fallback cwd and warns when no project is selected", () => {
    const result = resolveAgentCwd({ fallbackCwd: FALLBACK });

    expect(result.cwd).toBe(FALLBACK);
    expect(result.source).toBe("fallback");
    expect(result.warning).toContain("No project folder is selected");
  });

  it("applies selected project cwd to template/demo workspace agents", () => {
    const workspace: CmdinoWorkspaceFile = {
      schemaVersion: 3,
      workspaceName: "Template",
      terminals: [
        {
          configId: "agent-1",
          order: 0,
          label: "Claude Architect",
          agentKind: "claude",
          launchCommand: "claude",
          cwd: undefined,
          dinoId: "female-cole",
          attachments: [],
        },
        {
          configId: "agent-2",
          order: 1,
          label: "Codex Builder",
          agentKind: "codex",
          launchCommand: "codex",
          cwd: undefined,
          dinoId: "male-kira",
          attachments: [],
        },
      ],
      workflowLinks: [],
      workflowNodePositions: {},
    };

    const resolved = resolveWorkspaceAgentCwds(workspace, {
      selectedProjectRoot: PROJECT_A,
      fallbackCwd: FALLBACK,
    });

    expect(resolved.terminals.map((terminal) => terminal.cwd)).toEqual([PROJECT_A, PROJECT_A]);
    expect(workspace.terminals.map((terminal) => terminal.cwd)).toEqual([undefined, undefined]);
  });

  it("detects project switch cwd mismatch without mutating existing agents", () => {
    expect(detectCwdMismatch(PROJECT_A, PROJECT_B)).toBe(true);
    expect(getAgentCwdHealth({
      agentCwd: PROJECT_A,
      selectedProjectRoot: PROJECT_B,
    })).toMatchObject({
      status: "different",
      label: "Different cwd",
    });
  });

  it("includes the selected project path in cwd mismatch warnings", () => {
    const health = getAgentCwdHealth({
      agentCwd: PROJECT_A,
      selectedProjectRoot: PROJECT_B,
    });

    expect(health.warning).toContain(PROJECT_B);
  });
});
