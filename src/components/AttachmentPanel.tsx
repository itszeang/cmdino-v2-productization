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
            background:   "#0d1520",
            border:       `1px solid ${error ? "#f8717155" : "#1a3a4a"}`,
            color:        "#c8d8e8",
            fontSize:     10,
            padding:      "3px 7px",
            borderRadius: 2,
            fontFamily:   "monospace",
            outline:      "none",
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            background:   "none",
            border:       "1px solid #00c8ff33",
            color:        "#00c8ff",
            fontSize:     9,
            padding:      "2px 8px",
            borderRadius: 2,
            fontFamily:   "inherit",
            fontWeight:   700,
            cursor:       "pointer",
          }}
        >ADD</button>
        <button
          onClick={onClose}
          style={{
            background:   "none",
            border:       "1px solid #162a3a",
            color:        "#3a6a8a",
            fontSize:     9,
            padding:      "2px 6px",
            borderRadius: 2,
            fontFamily:   "inherit",
            cursor:       "pointer",
          }}
        >✕</button>
      </div>
      {error && <span style={{ color: "#f87171", fontSize: 9 }}>{error}</span>}
    </div>
  );
}
