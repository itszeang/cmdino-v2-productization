import { open } from "@tauri-apps/plugin-dialog";

const isTauri = Boolean(
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__,
);

export async function pickProjectFolder(): Promise<string | null> {
  if (!isTauri) return null;

  const selected = await open({
    directory: true,
    multiple: false,
    title: "Select Project Folder",
  });

  if (typeof selected === "string") return selected;
  if (Array.isArray(selected)) return selected[0] ?? null;
  return null;
}

