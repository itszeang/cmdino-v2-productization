import { describe, expect, it } from "vitest";
import {
  addContextManifestFile,
  buildContextRelativePath,
  createEmptyContextManifest,
  sanitizeContextManifest,
  selectContextReferences,
  slugifyContextPart,
} from "./contextLibrary";

describe("contextLibrary", () => {
  it("sanitizes title and agent names into stable slugs", () => {
    expect(slugifyContextPart("Project Brief!")).toBe("project-brief");
    expect(slugifyContextPart(" Claude Planner / Architect ")).toBe("claude-planner-architect");
  });

  it("builds global and agent-specific relative paths under .cmdino/context", () => {
    expect(buildContextRelativePath({
      title: "Project Brief",
      target: "global",
    })).toBe(".cmdino/context/global/project-brief.md");

    expect(buildContextRelativePath({
      title: "Role",
      target: "agent",
      agentLabel: "Claude Planner",
    })).toBe(".cmdino/context/agents/claude-planner/role.md");
  });

  it("does not choose an existing manifest path", () => {
    expect(buildContextRelativePath({
      title: "Project Brief",
      target: "global",
      existingRelativePaths: [".cmdino/context/global/project-brief.md"],
    })).toBe(".cmdino/context/global/project-brief-2.md");
  });

  it("adds manifest files without rewriting existing entries", () => {
    const manifest = createEmptyContextManifest("C:\\project");
    const next = addContextManifestFile(manifest, {
      title: "Project Brief",
      target: "global",
      relativePath: ".cmdino/context/global/project-brief.md",
      now: "2026-05-15T00:00:00.000Z",
    });

    expect(next.files).toHaveLength(1);
    expect(next.files[0]).toMatchObject({
      title: "Project Brief",
      target: "global",
      relativePath: ".cmdino/context/global/project-brief.md",
    });
    expect(next.files[0].id).toBeTruthy();
    expect(manifest.files).toHaveLength(0);
  });

  it("recovers from corrupt manifest input", () => {
    expect(sanitizeContextManifest("bad", "C:\\project")).toEqual({
      version: 1,
      projectRoot: "C:\\project",
      files: [],
    });
  });

  it("selects global and matching agent context references", () => {
    const manifest = {
      version: 1 as const,
      projectRoot: "C:\\project",
      files: [
        {
          id: "global",
          title: "Project Brief",
          target: "global" as const,
          relativePath: ".cmdino/context/global/project-brief.md",
          createdAt: "now",
          updatedAt: "now",
        },
        {
          id: "agent",
          title: "Role",
          target: "agent" as const,
          agentId: "agent-1",
          agentLabel: "Claude Planner",
          relativePath: ".cmdino/context/agents/claude-planner/role.md",
          createdAt: "now",
          updatedAt: "now",
        },
      ],
    };

    expect(selectContextReferences(manifest, {
      agentId: "agent-1",
      agentLabel: "Claude Planner",
    })).toEqual({
      global: [".cmdino/context/global/project-brief.md"],
      agent: [".cmdino/context/agents/claude-planner/role.md"],
    });
  });
});
