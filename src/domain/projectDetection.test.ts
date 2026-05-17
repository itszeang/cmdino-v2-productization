import { describe, expect, it } from "vitest";
import {
  createUnknownProjectWorkspace,
  projectNameFromPath,
  summarizeProjectWorkspace,
} from "./projectDetection";

describe("projectDetection", () => {
  it("extracts project name from a Windows path", () => {
    expect(projectNameFromPath("C:\\Users\\burak\\Desktop\\cmdino-build")).toBe("cmdino-build");
  });

  it("extracts project name from a Unix-like path", () => {
    expect(projectNameFromPath("/Users/burak/projects/my-saas")).toBe("my-saas");
  });

  it("handles trailing slashes", () => {
    expect(projectNameFromPath("C:\\Users\\burak\\projects\\my-app\\")).toBe("my-app");
    expect(projectNameFromPath("/Users/burak/projects/my-app/")).toBe("my-app");
  });

  it("returns a fallback for empty or invalid paths", () => {
    expect(projectNameFromPath("")).toBe("Untitled Project");
    expect(projectNameFromPath("   ")).toBe("Untitled Project");
    expect(projectNameFromPath("C:\\")).toBe("Untitled Project");
  });

  it("creates an unknown project workspace with safe defaults", () => {
    const project = createUnknownProjectWorkspace("C:\\Users\\burak\\Desktop\\cmdino-build");

    expect(project.name).toBe("cmdino-build");
    expect(project.rootPath).toBe("C:\\Users\\burak\\Desktop\\cmdino-build");
    expect(project.detectedFramework).toBe("unknown");
    expect(project.packageManager).toBe("unknown");
    expect(project.gitDetected).toBe(false);
    expect(project.createdAt).toBeGreaterThan(0);
    expect(project.lastOpenedAt).toBeGreaterThan(0);
  });

  it("summarizes a project workspace without native filesystem detection", () => {
    const project = createUnknownProjectWorkspace("/tmp/demo");
    const summary = summarizeProjectWorkspace(project);

    expect(summary.workspace).toBe(project);
    expect(summary.hasReadme).toBe(false);
    expect(summary.hasPackageJson).toBe(false);
    expect(summary.hasSrcDirectory).toBe(false);
    expect(summary.hasGitRepository).toBe(false);
  });
});

