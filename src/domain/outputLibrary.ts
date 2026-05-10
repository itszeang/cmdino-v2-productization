import type { GeneratedOutputFile } from "./attachments";

const BUILD_KIT_RE = /\b(build|share|release|screenshot|checklist|kit|public)\b/i;

export type OutputLibraryGroup = {
  label: string;
  files: GeneratedOutputFile[];
};

export function groupOutputLibraryFiles(files: GeneratedOutputFile[]): OutputLibraryGroup[] {
  const memory: GeneratedOutputFile[] = [];
  const transcript: GeneratedOutputFile[] = [];
  const buildKit: GeneratedOutputFile[] = [];
  const other: GeneratedOutputFile[] = [];

  for (const file of files) {
    if (file.kind === "memory_brief") {
      memory.push(file);
    } else if (file.kind === "transcript") {
      transcript.push(file);
    } else if (BUILD_KIT_RE.test(file.fileName)) {
      buildKit.push(file);
    } else {
      other.push(file);
    }
  }

  const groups: OutputLibraryGroup[] = [];
  if (memory.length > 0)     groups.push({ label: "Continue Later", files: memory });
  if (transcript.length > 0) groups.push({ label: "Terminal Logs",  files: transcript });
  if (buildKit.length > 0)   groups.push({ label: "Share Progress", files: buildKit });
  if (other.length > 0)      groups.push({ label: "Other Notes",    files: other });
  return groups;
}

export function kindReadableLabel(kind: GeneratedOutputFile["kind"]): string {
  if (kind === "memory_brief") return "Memory Brief";
  if (kind === "transcript")   return "Terminal Log";
  if (kind === "markdown")     return "Note";
  return "Text File";
}

export function kindPurposeHint(kind: GeneratedOutputFile["kind"]): string {
  if (kind === "memory_brief") return "Use this to resume context in a future session";
  if (kind === "transcript")   return "Raw terminal output from this session";
  if (kind === "markdown")     return "Generated markdown output";
  return "Generated text file";
}
