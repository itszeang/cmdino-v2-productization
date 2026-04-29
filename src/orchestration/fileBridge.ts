import { invoke } from "@tauri-apps/api/core";

export interface ReadFileResult {
  content:   string;
  truncated: boolean;
}

const DEMO_PREFIX   = "cmdino-demo://";
const PRESET_PREFIX = "cmdino-preset://";
const PREVIEW_LIMIT = 262_144; // 256 KiB

async function fetchPublicFile(url: string, label: string): Promise<ReadFileResult> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${label} not found (${res.status})`);
  const text      = await res.text();
  const truncated = text.length > PREVIEW_LIMIT;
  return {
    content:   truncated ? text.slice(0, PREVIEW_LIMIT) : text,
    truncated,
  };
}

export const fileBridge = {
  /** Read file content up to 256 KiB.
   *  cmdino-preset:// → fetched from /preset-brains/
   *  cmdino-demo://   → fetched from /demo-skills/ (backward compat)
   *  All other paths  → Tauri read_file_preview command */
  async readPreview(path: string): Promise<ReadFileResult> {
    if (path.startsWith(PRESET_PREFIX)) {
      const name = path.slice(PRESET_PREFIX.length);
      return fetchPublicFile(
        `/preset-brains/${encodeURIComponent(name)}`,
        `Preset brain: ${name}`,
      );
    }
    if (path.startsWith(DEMO_PREFIX)) {
      const name = path.slice(DEMO_PREFIX.length);
      return fetchPublicFile(
        `/demo-skills/${encodeURIComponent(name)}`,
        `Demo skill: ${name}`,
      );
    }
    return invoke<ReadFileResult>("read_file_preview", { path });
  },
};
