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
  const text = await res.text();
  // Vite SPA fallback returns 200 + index.html for missing assets — reject it.
  const lo = text.trimStart().toLowerCase();
  if (lo.startsWith("<!doctype html") || lo.startsWith("<html")) {
    throw new Error(`${label} not found`);
  }
  const truncated = text.length > PREVIEW_LIMIT;
  return {
    content:   truncated ? text.slice(0, PREVIEW_LIMIT) : text,
    truncated,
  };
}

export const fileBridge = {
  /** Read file content up to 256 KiB.
   *  cmdino-preset://<id> → Tauri read_preset_brain (whitelisted .agents/ paths)
   *  cmdino-demo://       → fetched from /demo-skills/ (backward compat)
   *  All other paths      → Tauri read_file_preview command */
  async readPreview(path: string): Promise<ReadFileResult> {
    if (path.startsWith(PRESET_PREFIX)) {
      const id = path.slice(PRESET_PREFIX.length);
      try {
        return await invoke<ReadFileResult>("read_preset_brain", { id });
      } catch (err) {
        // Tauri throws the Rust error string — surface it as a proper Error.
        throw new Error(String(err));
      }
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
