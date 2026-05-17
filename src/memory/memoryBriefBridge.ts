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

/**
 * Write a prompt file to `<dir>/<relPath>`, creating intermediate dirs.
 * relPath must be relative with no `..` components.
 * Returns the absolute path of the written file.
 */
export function writePromptFile(dir: string, relPath: string, content: string): Promise<string> {
  return invoke<string>("write_prompt_file", { dir, relPath, content });
}
