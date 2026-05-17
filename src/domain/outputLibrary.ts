import type { GeneratedOutputFile } from "./attachments";

const BUILD_KIT_RE = /\b(build|share|release|screenshot|checklist|kit|public)\b/i;
const WORKFLOW_RE = /\bworkflow[-_](final|step|build|artifact|handoff)|workflow-final-output|workflow-step-artifacts|workflow-build-public-draft/i;

export type OutputLibraryGroup = {
  label: string;
  files: GeneratedOutputFile[];
};

export function groupOutputLibraryFiles(files: GeneratedOutputFile[]): OutputLibraryGroup[] {
  const memory: GeneratedOutputFile[] = [];
  const transcript: GeneratedOutputFile[] = [];
  const buildKit: GeneratedOutputFile[] = [];
  const workflow: GeneratedOutputFile[] = [];
  const other: GeneratedOutputFile[] = [];

  for (const file of files) {
    if (file.kind === "memory_brief") {
      memory.push(file);
    } else if (file.kind === "transcript") {
      transcript.push(file);
    } else if (WORKFLOW_RE.test(file.fileName)) {
      workflow.push(file);
    } else if (BUILD_KIT_RE.test(file.fileName)) {
      buildKit.push(file);
    } else {
      other.push(file);
    }
  }

  const groups: OutputLibraryGroup[] = [];
  if (memory.length > 0)     groups.push({ label: "Memory Briefs", files: memory });
  if (transcript.length > 0) groups.push({ label: "Terminal Logs",  files: transcript });
  if (workflow.length > 0)   groups.push({ label: "Workflow Artifacts", files: workflow });
  if (buildKit.length > 0)   groups.push({ label: "Share Progress", files: buildKit });
  if (other.length > 0)      groups.push({ label: "Notes and Text",    files: other });
  return groups;
}

export function kindReadableLabel(kind: GeneratedOutputFile["kind"]): string {
  if (kind === "memory_brief") return "Memory Brief";
  if (kind === "transcript")   return "Terminal Log";
  if (kind === "markdown")     return "Note";
  return "Text File";
}

export function outputFileDisplayLabel(file: GeneratedOutputFile): string {
  const name = file.fileName.toLowerCase();
  if (name.includes("workflow-final-output")) return "Workflow Final Output";
  if (name.includes("workflow-step-artifacts")) return "Workflow Step Artifacts";
  if (name.includes("workflow-build-public-draft")) return "Build-in-Public Draft";
  return kindReadableLabel(file.kind);
}

export function kindPurposeHint(kind: GeneratedOutputFile["kind"]): string {
  if (kind === "memory_brief") return "Continuity context for a later session";
  if (kind === "transcript")   return "Raw terminal log for audit or debugging";
  if (kind === "markdown")     return "Readable generated output";
  return "Generated text file";
}
