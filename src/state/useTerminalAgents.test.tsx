import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CmdinoWorkspaceFile } from "../domain/workspace";
import { useTerminalAgents } from "./useTerminalAgents";

const WORKSPACE: CmdinoWorkspaceFile = {
  schemaVersion: 3,
  workspaceName: "Loaded Workspace",
  terminals: [
    {
      configId: "config-1",
      order: 0,
      label: "Claude Planner",
      agentKind: "claude",
      launchCommand: "claude",
      cwd: "C:\\project",
      dinoId: "female-cole",
      attachments: [],
    },
    {
      configId: "config-2",
      order: 1,
      label: "Codex Builder",
      agentKind: "codex",
      launchCommand: "codex",
      cwd: "C:\\project",
      dinoId: "male-kira",
      attachments: [],
    },
  ],
  workflowLinks: [
    {
      id: "route-1",
      sourceConfigId: "config-1",
      targetConfigId: "config-2",
      kind: "route",
      count: 1,
      updatedAt: 1,
    },
  ],
  workflowNodePositions: {
    "config-1": { x: 100, y: 100 },
    "config-2": { x: 300, y: 100 },
  },
};

describe("useTerminalAgents", () => {
  it("new workspace reset clears agents, routes, positions, and running ids", () => {
    const { result } = renderHook(() => useTerminalAgents());

    act(() => {
      result.current.loadWorkspaceConfig(WORKSPACE);
    });

    expect(result.current.workspaceName).toBe("Loaded Workspace");
    expect(result.current.agents).toHaveLength(2);
    expect(result.current.workflowLinks).toHaveLength(1);
    expect(Object.keys(result.current.workflowNodePositions)).toHaveLength(2);

    act(() => {
      result.current.startAgent(result.current.agents[0].id);
      result.current.resetWorkspace("Untitled Workspace");
    });

    expect(result.current.workspaceName).toBe("Untitled Workspace");
    expect(result.current.agents).toEqual([]);
    expect(result.current.runningAgentIds.size).toBe(0);
    expect(result.current.workflowLinks).toEqual([]);
    expect(result.current.workflowNodePositions).toEqual({});
  });
});
