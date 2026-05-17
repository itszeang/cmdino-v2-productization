import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { ProjectWorkspace } from "../domain/projectWorkspace";
import { useProjectWorkspace } from "./useProjectWorkspace";

function project(overrides: Partial<ProjectWorkspace> = {}): ProjectWorkspace {
  return {
    id: "project-1",
    name: "Demo Project",
    rootPath: "C:\\Users\\burak\\Desktop\\demo-project",
    createdAt: 100,
    lastOpenedAt: 100,
    detectedFramework: "unknown",
    packageManager: "unknown",
    gitDetected: false,
    ...overrides,
  };
}

describe("useProjectWorkspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("selects a project, refreshes last opened time, and persists it as current", () => {
    const { result, unmount } = renderHook(() => useProjectWorkspace());

    act(() => {
      result.current.selectProject(project());
    });

    expect(result.current.currentProject).toMatchObject({
      id: "project-1",
      name: "Demo Project",
      rootPath: "C:\\Users\\burak\\Desktop\\demo-project",
    });
    expect(result.current.currentProject?.lastOpenedAt).toBeGreaterThanOrEqual(100);
    expect(result.current.recentProjects).toHaveLength(1);
    expect(result.current.recentProjects[0].rootPath).toBe("C:\\Users\\burak\\Desktop\\demo-project");

    unmount();

    const restored = renderHook(() => useProjectWorkspace());
    expect(restored.result.current.currentProject?.rootPath).toBe("C:\\Users\\burak\\Desktop\\demo-project");
    expect(restored.result.current.recentProjects.map((item) => item.rootPath)).toEqual([
      "C:\\Users\\burak\\Desktop\\demo-project",
    ]);
  });

  it("keeps recent projects deduped by root path", () => {
    const { result } = renderHook(() => useProjectWorkspace());

    act(() => {
      result.current.selectProject(project({ id: "original", createdAt: 10 }));
      result.current.selectProject(project({
        id: "replacement",
        name: "Renamed Demo",
        rootPath: "C:\\Users\\burak\\Desktop\\demo-project",
        createdAt: 20,
      }));
    });

    expect(result.current.recentProjects).toHaveLength(1);
    expect(result.current.recentProjects[0]).toMatchObject({
      id: "original",
      name: "Renamed Demo",
      rootPath: "C:\\Users\\burak\\Desktop\\demo-project",
      createdAt: 10,
    });
  });

  it("clears the current project without deleting recent projects", () => {
    const { result } = renderHook(() => useProjectWorkspace());

    act(() => {
      result.current.selectProject(project());
      result.current.clearCurrentProject();
    });

    expect(result.current.currentProject).toBeNull();
    expect(result.current.recentProjects).toHaveLength(1);
  });
});
