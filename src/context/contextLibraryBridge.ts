import { invoke } from "@tauri-apps/api/core";
import type { CmdinoContextManifest } from "../domain/contextLibrary";

export interface ReadContextManifestResult {
  manifest: CmdinoContextManifest;
  warning?: string;
}

export function readProjectContextManifest(projectRoot: string): Promise<ReadContextManifestResult> {
  return invoke<ReadContextManifestResult>("read_project_context_manifest", { projectRoot });
}

export function writeProjectContextManifest(
  projectRoot: string,
  manifest: CmdinoContextManifest,
): Promise<CmdinoContextManifest> {
  return invoke<CmdinoContextManifest>("write_project_context_manifest", { projectRoot, manifest });
}

export function writeProjectContextFile(
  projectRoot: string,
  relativePath: string,
  content: string,
): Promise<string> {
  return invoke<string>("write_project_context_file", { projectRoot, relativePath, content });
}

export function readProjectContextFile(
  projectRoot: string,
  relativePath: string,
): Promise<string> {
  return invoke<string>("read_project_context_file", { projectRoot, relativePath });
}
