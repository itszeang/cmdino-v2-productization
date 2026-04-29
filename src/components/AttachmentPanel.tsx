import { useState } from "react";
import { attachmentKindFromPath } from "../domain/orchestration";

/**
 * Lean add-attachment form. Primary orchestration controls are now in the
 * inline strip inside TerminalPane; this component remains for reuse.
 */
interface Props {
  onAdd:   (path: string) => void;
  onClose: () => void;
}

export function AttachmentPanel({ onAdd, onClose }: Props) {
  const [path,  setPath]  = useState("");
  const [error, setError] = useState("");

  function handleAdd() {
    const p = path.trim();
    if (!p) return;
    if (!attachmentKindFromPath(p)) {
      setError("Only .md and .txt files allowed.");
      return;
    }
    onAdd(p);
    setPath("");
    setError("");
    onClose();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          autoFocus
          value={path}
          onChange={(e) => { setPath(e.target.value); setError(""); }}
          onKeyDown={(e) => {
            if (e.key === "Enter")  handleAdd();
            if (e.key === "Escape") onClose();
          }}
          placeholder="Paste .md or .txt file path…"
          style={{
            flex:         1,
            background:   "var(--input-bg)",
            border:       `1px solid ${error ? "var(--danger)" : "var(--border-subtle)"}`,
            color:        "var(--text-main)",
            fontSize:     11,
            padding:      "6px 10px",
            borderRadius: 999,
            fontFamily:   "monospace",
            outline:      "none",
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            background:   "var(--accent)",
            border:       "1px solid transparent",
            color:        "var(--app-bg)",
            fontSize:     11,
            padding:      "6px 10px",
            borderRadius: 999,
            fontFamily:   "inherit",
            fontWeight:   700,
            cursor:       "pointer",
          }}
        >ADD</button>
        <button
          onClick={onClose}
          style={{
            background:   "transparent",
            border:       "1px solid transparent",
            color:        "var(--text-muted)",
            fontSize:     11,
            padding:      "6px 8px",
            borderRadius: 999,
            fontFamily:   "inherit",
            cursor:       "pointer",
          }}
        >x</button>
      </div>
      {error && <span style={{ color: "var(--danger)", fontSize: 11 }}>{error}</span>}
    </div>
  );
}
