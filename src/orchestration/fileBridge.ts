import { invoke } from "@tauri-apps/api/core";

export interface ReadFileResult {
  content:   string;
  truncated: boolean;
}

const DEMO_PREFIX   = "cmdino-demo://";
const PREVIEW_LIMIT = 262_144; // 256 KiB

export const fileBridge = {
  /** Read file content up to 256 KiB.
   *  Paths starting with cmdino-demo:// are fetched from /demo-skills/.
   *  All other paths invoke the Tauri read_file_preview command. */
  async readPreview(path: string): Promise<ReadFileResult> {
    if (path.startsWith(DEMO_PREFIX)) {
      const name = path.slice(DEMO_PREFIX.length);
      const res  = await fetch(`/demo-skills/${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error(`Demo skill not found: ${name} (${res.status})`);
      const text      = await res.text();
      const truncated = text.length > PREVIEW_LIMIT;
      return {
        content:   truncated ? text.slice(0, PREVIEW_LIMIT) : text,
        truncated,
      };
    }
    return invoke<ReadFileResult>("read_file_preview", { path });
  },
};
