export interface TerminalAttachment {
  id:       string;
  path:     string;
  fileName: string;
  addedAt:  number;
  /** "preset" = attached from a preset brain; "user" = manually attached. Not persisted. */
  source?:  "user" | "preset";
}

/** Returns "md" | "txt" if allowed, null if not permitted. */
export function attachmentKindFromPath(path: string): "md" | "txt" | null {
  const lower = path.toLowerCase().trim();
  if (lower.endsWith(".md"))  return "md";
  if (lower.endsWith(".txt")) return "txt";
  return null;
}
