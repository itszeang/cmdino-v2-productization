import { useEffect, useState } from "react";
import { MarkdownArtifactReader } from "./MarkdownArtifactReader";

// ── Public types ──────────────────────────────────────────────────────────────

export interface ArtifactReaderAction {
  label:     string;
  onClick:   () => void;
  disabled?: boolean;
  accent?:   boolean;
  danger?:   boolean;
}

interface Props {
  title:         string;
  artifactType?: string;
  sourceLabel?:  string;
  path?:         string;
  isAttached?:   boolean;
  content:       string | null;
  truncated?:    boolean;
  loading?:      boolean;
  error?:        string | null;
  isLog?:        boolean;
  actions?:      ArtifactReaderAction[];
  editable?:     boolean;
  onSaveEdit?:   (content: string) => Promise<{ ok: boolean; message: string }>;
  onClose:       () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ArtifactReaderModal({
  title, artifactType, sourceLabel, path, isAttached,
  content, truncated, loading, error, isLog,
  actions, editable, onSaveEdit, onClose,
}: Props) {
  const [mode, setMode] = useState<"read" | "edit">("read");
  const [draft, setDraft] = useState(content ?? "");
  const [saveNotice, setSaveNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    setDraft(content ?? "");
    setMode("read");
    setSaveNotice("");
  }, [content, path]);

  async function handleSaveEdit() {
    if (!onSaveEdit || saving) return;
    setSaving(true);
    const result = await onSaveEdit(draft);
    setSaveNotice(result.message);
    if (result.ok) setMode("read");
    setSaving(false);
  }

  const allActions: ArtifactReaderAction[] = [
    ...(editable && content !== null ? [{
      label: mode === "edit" ? "Preview" : "Edit",
      onClick: () => setMode((value) => value === "edit" ? "read" : "edit"),
      accent: mode !== "edit",
    }] : []),
    ...(mode === "edit" ? [{
      label: saving ? "Saving..." : "Save New Version",
      onClick: () => { void handleSaveEdit(); },
      disabled: saving || !onSaveEdit || draft === (content ?? ""),
      accent: true,
    }] : []),
    ...(actions ?? []),
  ];

  return (
    <div
      className="arm-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="arm-panel">

        {/* ── Header ── */}
        <div className="arm-header">
          <div className="arm-header-main">
            <div className="arm-title">{title}</div>
            <div className="arm-pills">
              {artifactType && (
                <span className="arm-pill arm-pill--type">{artifactType}</span>
              )}
              {sourceLabel && (
                <span className="arm-pill arm-pill--source">{sourceLabel}</span>
              )}
              {isAttached === true && (
                <span className="arm-pill arm-pill--attached">✓ Attached</span>
              )}
              {isAttached === false && (
                <span className="arm-pill arm-pill--unattached">Not attached</span>
              )}
            </div>
            {path && <div className="arm-path">{path}</div>}
          </div>
          <button className="arm-close" onClick={onClose} title="Close (Esc)">✕</button>
        </div>

        {/* ── Action bar ── */}
        {allActions.length > 0 && (
          <div className="arm-actions">
            {allActions.map((action, i) => {
              const baseColor  = action.disabled ? "var(--text-faint)" : action.danger ? "var(--danger)" : action.accent ? "var(--text-main)" : "var(--text-muted)";
              const baseBorder = action.disabled ? "transparent" : action.accent ? "var(--border-strong)" : "var(--border-subtle)";
              return (
                <button
                  key={i}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  style={{
                    background: "transparent", border: `1px solid ${baseBorder}`,
                    color: baseColor, fontSize: 11, padding: "5px 13px", borderRadius: 999,
                    fontFamily: "inherit", fontWeight: 600,
                    cursor: action.disabled ? "not-allowed" : "pointer",
                    flexShrink: 0, whiteSpace: "nowrap",
                    transition: "background 0.1s, color 0.1s, border-color 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    if (action.disabled) return;
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.background  = "var(--button-hover)";
                    b.style.color       = action.danger ? "var(--danger)" : "var(--text-main)";
                    b.style.borderColor = "var(--border-strong)";
                  }}
                  onMouseLeave={(e) => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.background  = "transparent";
                    b.style.color       = baseColor;
                    b.style.borderColor = baseBorder;
                  }}
                >
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
        {saveNotice && (
          <div className="arm-actions" style={{ color: saveNotice.startsWith("Saved") ? "var(--success)" : "var(--warning)", fontSize: 11 }}>
            {saveNotice}
          </div>
        )}

        {/* ── Content ── */}
        <div className="arm-content">
          {loading && (
            <div className="arm-status">Loading…</div>
          )}
          {error && !loading && (
            <div className="arm-status arm-status--error">{error}</div>
          )}
          {content !== null && !loading && mode === "edit" && (
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              spellCheck={false}
              style={{
                width: "100%",
                minHeight: "100%",
                boxSizing: "border-box",
                border: 0,
                outline: "none",
                resize: "none",
                padding: "12px 14px",
                background: "var(--terminal-bg)",
                color: "#e5e5e5",
                fontFamily: '"Cascadia Code", "JetBrains Mono", "Consolas", monospace',
                fontSize: 12,
                lineHeight: 1.65,
              }}
            />
          )}
          {content !== null && !loading && mode === "read" && (
            <>
              {truncated && (
                <div className="arm-truncation">
                  Truncated at 256 KB — file continues beyond this point
                </div>
              )}
              <div className="arm-reader-wrap">
                <MarkdownArtifactReader content={content} isLog={isLog} />
              </div>
            </>
          )}
          {!loading && !error && content === null && (
            <div className="arm-status">No content available.</div>
          )}
        </div>

      </div>
    </div>
  );
}
