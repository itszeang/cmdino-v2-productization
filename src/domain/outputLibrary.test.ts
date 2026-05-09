import { describe, expect, it } from "vitest";
import type { GeneratedOutputFile } from "./attachments";
import { groupOutputLibraryFiles } from "./outputLibrary";

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
      output("release-checklist.md", "markdown"),
      output("notes.md", "markdown"),
    ]);

    expect(groups.map((group) => group.label)).toEqual([
      "Memory Briefs",
      "Transcripts",
      "Build Updates / Share Kit",
      "Markdown / Other",
    ]);
    expect(groups[0].files).toHaveLength(1);
    expect(groups[1].files).toHaveLength(1);
    expect(groups[2].files).toHaveLength(1);
    expect(groups[3].files).toHaveLength(1);
  });
});
