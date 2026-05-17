import { describe, expect, it } from "vitest";
import type { GeneratedOutputFile } from "./attachments";
import { groupOutputLibraryFiles, outputFileDisplayLabel } from "./outputLibrary";

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
  it("groups generated outputs by library category", () => {
    const groups = groupOutputLibraryFiles([
      output("memory_brief_alpha.md", "memory_brief"),
      output("transcript_alpha.md", "transcript"),
      output("workflow-final-output_2026-05-11_task.md", "markdown"),
      output("release-checklist.md", "markdown"),
      output("notes.md", "markdown"),
    ]);

    expect(groups.map((group) => group.label)).toEqual([
      "Memory Briefs",
      "Terminal Logs",
      "Workflow Artifacts",
      "Share Progress",
      "Notes and Text",
    ]);
    expect(groups[0].files).toHaveLength(1);
    expect(groups[1].files).toHaveLength(1);
    expect(groups[2].files).toHaveLength(1);
    expect(groups[3].files).toHaveLength(1);
    expect(groups[4].files).toHaveLength(1);
  });

  it("labels workflow artifacts by filename", () => {
    expect(outputFileDisplayLabel(output("workflow-step-artifacts_alpha.md", "markdown")))
      .toBe("Workflow Step Artifacts");
    expect(outputFileDisplayLabel(output("workflow-build-public-draft_alpha.md", "markdown")))
      .toBe("Build-in-Public Draft");
  });
});
