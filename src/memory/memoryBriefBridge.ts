import { invoke } from "@tauri-apps/api/core";
import type { GeneratedOutputFile } from "../domain/attachments";

export interface MemoryBriefFileInput {
  fileName: string;
  content: string;
}

/** Neutral alias — same shape, used for non-brief output files. */
export type OutputFileInput = MemoryBriefFileInput;

export interface MemoryBriefWriteResult {
  outputDir: string;
  files: string[];
  count: number;
}

export function writeMemoryBriefs(files: MemoryBriefFileInput[]): Promise<MemoryBriefWriteResult> {
  return invoke<MemoryBriefWriteResult>("write_memory_briefs", { files });
}

/** Neutral wrapper — reuses existing Rust command; avoids backend churn for V1. */
export function writeOutputFiles(files: OutputFileInput[]): Promise<MemoryBriefWriteResult> {
  return invoke<MemoryBriefWriteResult>("write_memory_briefs", { files });
}

/** Returns metadata for .md/.txt files in the outputs folder, sorted by modified desc. */
export function listOutputFiles(): Promise<GeneratedOutputFile[]> {
  return invoke<GeneratedOutputFile[]>("list_output_files");
}

/** Delete a generated output file by fileName. Returns true if deleted, false if not found. */
export function deleteOutputFile(fileName: string): Promise<boolean> {
  return invoke<boolean>("delete_output_file", { fileName });
}
