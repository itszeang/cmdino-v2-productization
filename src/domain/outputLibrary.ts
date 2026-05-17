import type { GeneratedOutputFile } from "./attachments";

const WORKFLOW_RESULTS_RE = /workflow-final-output|workflow-step-artifacts|\bworkflow[-_](final|step|artifact|handoff)\b/i;
const SHARE_PROGRESS_RE = /build-in-public-post|workflow-build-public-draft|\b(build|share|release|screenshot|checklist|kit|public)\b/i;

export type OutputLibraryGroup = {
  label: string;
  hint: string;
  files: GeneratedOutputFile[];
};

export function groupOutputLibraryFiles(files: GeneratedOutputFile[]): OutputLibraryGroup[] {
  const workflow: GeneratedOutputFile[] = [];
  const memory: GeneratedOutputFile[] = [];
  const buildKit: GeneratedOutputFile[] = [];
  const transcript: GeneratedOutputFile[] = [];
  const other: GeneratedOutputFile[] = [];

  for (const file of files) {
    if (WORKFLOW_RESULTS_RE.test(file.fileName)) {
      workflow.push(file);
    } else if (file.kind === "memory_brief") {
      memory.push(file);
    } else if (SHARE_PROGRESS_RE.test(file.fileName)) {
      buildKit.push(file);
    } else if (file.kind === "transcript") {
      transcript.push(file);
    } else {
      other.push(file);
    }
  }

  const groups: OutputLibraryGroup[] = [];
  if (workflow.length > 0)   groups.push({ label: "Workflow Results",  hint: "Final outputs and step results from checkpoint workflows", files: workflow });
  if (memory.length > 0)     groups.push({ label: "Continue Later",    hint: "Memory briefs for picking up where you left off",          files: memory });
  if (buildKit.length > 0)   groups.push({ label: "Share Progress",    hint: "Build-in-public posts and progress summaries",             files: buildKit });
  if (transcript.length > 0) groups.push({ label: "Logs",              hint: "Raw terminal transcripts for audit or debugging",          files: transcript });
  if (other.length > 0)      groups.push({ label: "Notes",             hint: "Text notes and manually saved outputs",                    files: other });
  return groups;
}

export function kindReadableLabel(kind: GeneratedOutputFile["kind"]): string {
  if (kind === "memory_brief") return "Memory Brief";
  if (kind === "transcript")   return "Terminal Log";
  if (kind === "markdown")     return "Note";
  return "Text File";
}

export function artifactColor(file: GeneratedOutputFile): string {
  const lower = file.fileName.toLowerCase();
  if (lower.includes("workflow-final-output"))    return "#f59e0b";
  if (lower.includes("workflow-step-artifacts"))  return "#fb923c";
  if (lower.includes("build-in-public-post"))     return "#34d399";
  if (lower.includes("workflow-build-public"))    return "#34d399";
  if (file.kind === "memory_brief")               return "#c084fc";
  if (file.kind === "transcript")                 return "#60a5fa";
  if (file.kind === "markdown")                   return "#6b7280";
  return "#9ca3af";
}

export interface OutputVersionMetadata {
  isEditedVersion: boolean;
  version?: number;
  originalBaseName?: string;
}

const EDIT_VERSION_RE = /__edited-v(\d+)(?=\.(md|txt)$)/i;
const BASE_EDIT_VERSION_RE = /__edited-v\d+$/i;

function splitName(fileName: string): { base: string; ext: ".md" | ".txt" | "" } {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".md")) return { base: fileName.slice(0, -3), ext: ".md" };
  if (lower.endsWith(".txt")) return { base: fileName.slice(0, -4), ext: ".txt" };
  return { base: fileName, ext: "" };
}

export function isEditableOutputArtifact(file: GeneratedOutputFile): boolean {
  const name = file.fileName.toLowerCase();
  if (!name.endsWith(".md") && !name.endsWith(".txt")) return false;
  return file.kind === "markdown" || file.kind === "text" || file.kind === "memory_brief";
}

export function getOutputVersionMetadata(fileName: string): OutputVersionMetadata {
  const match = fileName.match(EDIT_VERSION_RE);
  if (!match) return { isEditedVersion: false };
  const { base } = splitName(fileName);
  return {
    isEditedVersion: true,
    version: Number(match[1]),
    originalBaseName: base.replace(BASE_EDIT_VERSION_RE, ""),
  };
}

export function outputVersionLabel(fileName: string): string {
  const metadata = getOutputVersionMetadata(fileName);
  return metadata.isEditedVersion && metadata.version
    ? `Edited v${metadata.version}`
    : "Original";
}

export function buildEditedOutputVersionFileName(
  fileName: string,
  existingFileNames: string[] = [],
): string {
  const { base, ext } = splitName(fileName);
  const targetExt = ext || ".md";
  const originalBase = base.replace(BASE_EDIT_VERSION_RE, "");
  const existing = new Set(existingFileNames.map((name) => name.toLowerCase()));
  let version = 2;
  let candidate = `${originalBase}__edited-v${version}${targetExt}`;
  while (existing.has(candidate.toLowerCase())) {
    version += 1;
    candidate = `${originalBase}__edited-v${version}${targetExt}`;
  }
  return candidate;
}

export function outputFileDisplayLabel(file: GeneratedOutputFile): string {
  const name = file.fileName.toLowerCase();
  const versionPrefix = getOutputVersionMetadata(file.fileName).isEditedVersion ? "Edited " : "";
  if (name.includes("workflow-final-output"))    return "Final Output";
  if (name.includes("workflow-step-artifacts"))  return "Step Results";
  if (name.includes("build-in-public-post"))     return "Build-in-Public Kit";
  if (name.includes("workflow-build-public"))    return "Build-in-Public Draft";
  return `${versionPrefix}${kindReadableLabel(file.kind)}`;
}

export function artifactPurposeHint(file: GeneratedOutputFile): string {
  const lower = file.fileName.toLowerCase();
  if (lower.includes("workflow-final-output"))   return "Complete workflow output — share or archive";
  if (lower.includes("workflow-step-artifacts")) return "Step-by-step results and handoffs from this run";
  if (lower.includes("build-in-public-post"))    return "Social post and progress summary — ready to share";
  if (lower.includes("workflow-build-public"))   return "Draft build-in-public post from this workflow";
  if (file.kind === "memory_brief")              return "Continuity context — attach to pick up where you left off";
  if (file.kind === "transcript")                return "Raw terminal output for audit or debugging";
  if (file.kind === "markdown")                  return "Readable generated output";
  return "Generated text file";
}

export function kindPurposeHint(kind: GeneratedOutputFile["kind"]): string {
  if (kind === "memory_brief") return "Continuity context for a later session";
  if (kind === "transcript")   return "Raw terminal log for audit or debugging";
  if (kind === "markdown")     return "Readable generated output";
  return "Generated text file";
}
