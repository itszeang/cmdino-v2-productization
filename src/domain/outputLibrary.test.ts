import { describe, expect, it } from "vitest";
import type { GeneratedOutputFile } from "./attachments";
import {
  artifactColor,
  artifactPurposeHint,
  buildEditedOutputVersionFileName,
  getOutputVersionMetadata,
  groupOutputLibraryFiles,
  isEditableOutputArtifact,
  outputFileDisplayLabel,
  outputVersionLabel,
} from "./outputLibrary";

function output(fileName: string, kind: GeneratedOutputFile["kind"]): GeneratedOutputFile {
  return {
    path: `C:\\tmp\\${fileName}`,
    fileName,
    sizeBytes: 100,
    modifiedAt: 1_777_777_777,
    kind,
  };
}

describe("groupOutputLibraryFiles", () => {
  it("groups generated outputs by library category in product order", () => {
    const groups = groupOutputLibraryFiles([
      output("memory_brief_alpha.md", "memory_brief"),
      output("transcript_alpha.md", "transcript"),
      output("workflow-final-output_2026-05-11_task.md", "markdown"),
      output("build-in-public-post_2026-05-11_task.md", "markdown"),
      output("release-checklist.md", "markdown"),
      output("notes.md", "markdown"),
    ]);

    expect(groups.map((g) => g.label)).toEqual([
      "Workflow Results",
      "Continue Later",
      "Share Progress",
      "Logs",
      "Notes",
    ]);
    expect(groups[0].files).toHaveLength(1);  // workflow-final-output
    expect(groups[1].files).toHaveLength(1);  // memory_brief
    expect(groups[2].files).toHaveLength(2);  // build-in-public + release-checklist
    expect(groups[3].files).toHaveLength(1);  // transcript
    expect(groups[4].files).toHaveLength(1);  // notes.md
  });

  it("groups include a non-empty hint string", () => {
    const groups = groupOutputLibraryFiles([
      output("workflow-final-output_task.md", "markdown"),
      output("memory_brief_alpha.md", "memory_brief"),
    ]);
    for (const group of groups) {
      expect(group.hint.length, `group "${group.label}" has no hint`).toBeGreaterThan(0);
    }
  });

  it("labels workflow artifacts by filename", () => {
    expect(outputFileDisplayLabel(output("workflow-step-artifacts_alpha.md", "markdown")))
      .toBe("Step Results");
    expect(outputFileDisplayLabel(output("workflow-final-output_alpha.md", "markdown")))
      .toBe("Final Output");
    expect(outputFileDisplayLabel(output("build-in-public-post_alpha.md", "markdown")))
      .toBe("Build-in-Public Kit");
    expect(outputFileDisplayLabel(output("workflow-build-public-draft_alpha.md", "markdown")))
      .toBe("Build-in-Public Draft");
  });

  it("assigns distinct artifact colors for workflow types", () => {
    expect(artifactColor(output("workflow-final-output_task.md", "markdown")))
      .not.toBe(artifactColor(output("notes.md", "markdown")));
    expect(artifactColor(output("build-in-public-post_task.md", "markdown")))
      .not.toBe(artifactColor(output("notes.md", "markdown")));
    expect(artifactColor(output("memory_brief_alpha.md", "memory_brief")))
      .toBe("#c084fc");
  });

  it("gives artifact-specific purpose hints for workflow files", () => {
    expect(artifactPurposeHint(output("workflow-final-output_task.md", "markdown")))
      .toContain("workflow output");
    expect(artifactPurposeHint(output("workflow-step-artifacts_task.md", "markdown")))
      .toContain("Step-by-step");
    expect(artifactPurposeHint(output("build-in-public-post_task.md", "markdown")))
      .toContain("share");
    expect(artifactPurposeHint(output("memory_brief_alpha.md", "memory_brief")))
      .toContain("pick up where");
  });

  it("builds edited artifact version names without replacing originals", () => {
    expect(buildEditedOutputVersionFileName("notes.md", ["notes.md"]))
      .toBe("notes__edited-v2.md");
    expect(buildEditedOutputVersionFileName("notes.md", [
      "notes.md",
      "notes__edited-v2.md",
    ])).toBe("notes__edited-v3.md");
  });

  it("detects edited version metadata", () => {
    expect(getOutputVersionMetadata("notes__edited-v3.md")).toEqual({
      isEditedVersion: true,
      version: 3,
      originalBaseName: "notes",
    });
    expect(outputVersionLabel("notes__edited-v3.md")).toBe("Edited v3");
    expect(outputVersionLabel("notes.md")).toBe("Original");
  });

  it("classifies editable markdown and text artifacts", () => {
    expect(isEditableOutputArtifact(output("notes.md", "markdown"))).toBe(true);
    expect(isEditableOutputArtifact(output("notes.txt", "text"))).toBe(true);
    expect(isEditableOutputArtifact(output("session_memory.md", "memory_brief"))).toBe(true);
    expect(isEditableOutputArtifact(output("transcript_alpha.md", "transcript"))).toBe(false);
  });

  it("labels edited notes distinctly", () => {
    expect(outputFileDisplayLabel(output("notes__edited-v2.md", "markdown")))
      .toBe("Edited Note");
  });
});
