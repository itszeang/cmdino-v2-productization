import { invoke } from "@tauri-apps/api/core";

export interface ReadFileResult {
  content:   string;
  truncated: boolean;
}

export const fileBridge = {
  /** Read file content up to 256 KiB. Throws on missing or unreadable file. */
  readPreview(path: string): Promise<ReadFileResult> {
    return invoke<ReadFileResult>("read_file_preview", { path });
  },
};
