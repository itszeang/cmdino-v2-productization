import { invoke } from "@tauri-apps/api/core";

export const workspaceBridge = {
  /** Persist JSON content under the given filename slug. Returns the saved path. */
  save(fileName: string, content: string): Promise<string> {
    return invoke<string>("save_workspace_file", { fileName, content });
  },

  /** Load raw JSON string for the given filename slug. */
  load(fileName: string): Promise<string> {
    return invoke<string>("load_workspace_file", { fileName });
  },

  /** List all saved workspace name slugs (no extension). */
  list(): Promise<string[]> {
    return invoke<string[]>("list_workspace_files");
  },

  /** Delete a saved workspace by name slug. Returns true if deleted, false if not found. */
  delete(fileName: string): Promise<boolean> {
    return invoke<boolean>("delete_workspace_file", { fileName });
  },
};
