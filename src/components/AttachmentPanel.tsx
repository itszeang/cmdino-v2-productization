import { useState, useMemo } from "react";
import { attachmentKindFromPath } from "../domain/orchestration";
import { groupAttachments, buildOwnershipMap } from "../domain/attachments";
import { fileBridge } from "../orchestration/fileBridge";
import type { TerminalAgent } from "../domain/terminalAgent";
import type { GeneratedOutputFile } from "../domain/attachments";

// ── Preview state ─────────────────────────────────────────────────────────────

interface PreviewState {
  content:   string | null;
  truncated: boolean;
  loading:   boolean;
  error:     string | null;
}
const PREVIEW_IDLE: PreviewState = { content: null, truncated: false, loading: false, error: null };

// ── Selected item ─────────────────────────────────────────────────────────────

interface SelectedItem {
  path:         string;
  fileName:     string;
  /** null = generated file not yet attached to this agent */
  attachmentId: string | null;
  source:       "user" | "preset" | "generated";
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  agent:                     TerminalAgent;
  allAgents:                 TerminalAgent[];
  generatedOutputFiles:      GeneratedOutputFile[];
  isAlive:                   boolean;
  onAddAttachment:           (path: string, source?: "user" | "preset" | "generated") => void;
  onRemoveAttachment:        (id: string) => void;
  onSendAttachment:          (path: string, fileName: string) => Promise<void>;
  onRefreshGeneratedOutputs: () => void;
  onClose:                   () => void;
}

// ── Small primitives ──────────────────────────────────────────────────────────

function ActionBtn({
  onClick, disabled = false, accent = false, danger = false, children,
}: {
  onClick: () => void; disabled?: boolean; accent?: boolean; danger?: boolean;
  children: React.ReactNode;
}) {
  const baseColor = disabled ? "var(--text-faint)"
    : danger  ? "var(--danger)"
    : accent  ? "var(--text-main)"
    : "var(--text-muted)";
  const baseBorder = disabled ? "transparent"
    : accent  ? "var(--border-strong)"
    : "var(--border-subtle)";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "transparent",
        border: `1px solid ${baseBorder}`,
        color: baseColor,
        fontSize: 10, padding: "3px 8px", borderRadius: 999,
        fontFamily: "inherit", fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        flexShrink: 0, whiteSpace: "nowrap",
        transition: "background 0.1s, color 0.1s, border-color 0.1s",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background    = "var(--button-hover)";
        b.style.color         = danger ? "var(--danger)" : "var(--text-main)";
        b.style.borderColor   = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background  = "transparent";
        b.style.color       = baseColor;
        b.style.borderColor = baseBorder;
      }}
    >
      {children}
    </button>
  );
}

function KindBadge({ kind }: { kind: GeneratedOutputFile["kind"] }) {
  const labels: Record<string, string> = {
    memory_brief: "BRIEF",
    transcript:   "XSCRIPT",
    text:         "TXT",
    markdown:     "MD",
  };
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, letterSpacing: 0.4,
      color: "var(--text-faint)", background: "var(--button-bg)",
      padding: "1px 4px", borderRadius: 3, flexShrink: 0,
    }}>
      {labels[kind] ?? "FILE"}
    </span>
  );
}

function OwnerBadge({ owners }: { owners: string[] }) {
  if (owners.length === 0) {
    return <span style={{ fontSize: 8, color: "var(--text-faint)", letterSpacing: 0.2 }}>unused</span>;
  }
  const label = owners.length === 1 ? owners[0] : `${owners.length} agents`;
  return (
    <span style={{ fontSize: 8, color: "var(--success)", letterSpacing: 0.2, maxWidth: 80,
      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      title={owners.join(", ")}
    >
      {label}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, letterSpacing: 0.9,
      color: "var(--text-faint)", padding: "7px 12px 3px",
      textTransform: "uppercase" as const,
    }}>
      {children}
    </div>
  );
}

function FileRow({
  fileName, isSelected, isAttached, onClick, right,
}: {
  fileName:   string;
  isSelected: boolean;
  isAttached: boolean;
  onClick:    () => void;
  right?:     React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 12px",
        background: isSelected ? "var(--button-bg)" : "transparent",
        cursor: "pointer",
        borderLeft: isSelected
          ? "2px solid var(--border-strong)"
          : "2px solid transparent",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => {
        if (!isSelected)
          (e.currentTarget as HTMLDivElement).style.background = "var(--surface-2)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected)
          (e.currentTarget as HTMLDivElement).style.background = "transparent";
      }}
    >
      <span style={{
        fontSize: 10,
        color: isAttached ? "var(--text-main)" : "var(--text-muted)",
        flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis",
        whiteSpace: "nowrap", fontFamily: "monospace",
      }}>
        {fileName}
      </span>
      {right && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {right}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AttachmentPanel({
  agent, allAgents, generatedOutputFiles, isAlive,
  onAddAttachment, onRemoveAttachment, onSendAttachment,
  onRefreshGeneratedOutputs, onClose,
}: Props) {
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [preview,  setPreview]  = useState<PreviewState>(PREVIEW_IDLE);
  const [addInput, setAddInput] = useState("");
  const [addError, setAddError] = useState("");
  const [sending,  setSending]  = useState(false);

  const atts = agent.attachments ?? [];

  const generatedPaths = useMemo(
    () => new Set(generatedOutputFiles.map((f) => f.path)),
    [generatedOutputFiles],
  );

  const groups = useMemo(
    () => groupAttachments(atts, generatedPaths),
    [atts, generatedPaths],
  );

  const ownershipMap = useMemo(
    () => buildOwnershipMap(allAgents),
    [allAgents],
  );

  // Which generated files are already attached to this agent (by path)
  const attachedGenPathSet = useMemo(
    () => new Set(groups.generated.map((a) => a.path)),
    [groups.generated],
  );

  function selectItem(item: SelectedItem) {
    if (selected?.path === item.path) {
      setSelected(null);
      setPreview(PREVIEW_IDLE);
    } else {
      setSelected(item);
      setPreview(PREVIEW_IDLE);
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  function handleAddPath() {
    const p = addInput.trim();
    if (!p) return;
    if (!attachmentKindFromPath(p)) {
      setAddError("Only .md and .txt files allowed.");
      return;
    }
    onAddAttachment(p, "user");
    setAddInput("");
    setAddError("");
  }

  async function handlePreview() {
    if (!selected) return;
    setPreview({ content: null, truncated: false, loading: true, error: null });
    try {
      const r = await fileBridge.readPreview(selected.path);
      setPreview({ content: r.content, truncated: r.truncated, loading: false, error: null });
    } catch (err) {
      setPreview({
        content: null, truncated: false, loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleSend() {
    if (!selected || !isAlive || sending) return;
    setSending(true);
    try {
      await onSendAttachment(selected.path, selected.fileName);
    } finally {
      setSending(false);
    }
  }

  function handleAttach() {
    if (!selected) return;
    onAddAttachment(selected.path, selected.source);
    setSelected(null);
  }

  function handleRemove() {
    if (!selected?.attachmentId) return;
    onRemoveAttachment(selected.attachmentId);
    setSelected(null);
    setPreview(PREVIEW_IDLE);
  }

  function handleCopyPath() {
    if (!selected) return;
    void navigator.clipboard.writeText(selected.path);
  }

  // ── Derived action availability ───────────────────────────────────────────

  const isCurrentlyAttached = selected !== null && selected.attachmentId !== null;
  const canAttach           = selected !== null && !isCurrentlyAttached;
  const canSend             = selected !== null && isAlive && !sending;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="att-panel">

      {/* ── Title row ── */}
      <div className="att-header">
        <div className="att-header-title">
          <span className="att-header-name">Context</span>
          <span className="att-header-sub">working memory</span>
          {atts.length > 0 && (
            <span style={{ color: "var(--text-faint)", fontWeight: 400, fontSize: 10 }}>
              {atts.length} file{atts.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span className="att-header-agent">{agent.label}</span>
      </div>

      {/* ── Paste-path input row ── */}
      <div className="att-input-row">
        <input
          autoFocus
          value={addInput}
          onChange={(e) => { setAddInput(e.target.value); setAddError(""); }}
          onKeyDown={(e) => {
            if (e.key === "Enter")  handleAddPath();
            if (e.key === "Escape") onClose();
          }}
          placeholder="Paste .md / .txt path…"
          style={{
            flex: 1, background: "var(--surface-0)",
            border: `1px solid ${addError ? "var(--danger)" : "var(--border-subtle)"}`,
            color: "var(--text-main)", fontSize: 10, padding: "5px 9px",
            borderRadius: 999, fontFamily: "monospace", outline: "none", minWidth: 100,
          }}
        />
        {addError && (
          <span style={{ color: "var(--danger)", fontSize: 9, flexShrink: 0 }}>{addError}</span>
        )}
        <ActionBtn onClick={handleAddPath} accent>Add</ActionBtn>
        <button
          onClick={onRefreshGeneratedOutputs}
          title="Refresh generated outputs"
          style={{
            background: "transparent", border: "none", color: "var(--text-faint)",
            fontSize: 12, cursor: "pointer", padding: "2px 4px", borderRadius: 4, lineHeight: 1,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-faint)"; }}
        >↻</button>
        <button
          onClick={onClose}
          title="Close"
          style={{
            background: "transparent", border: "none", color: "var(--text-faint)",
            fontSize: 12, cursor: "pointer", padding: "2px 4px", borderRadius: 4, lineHeight: 1,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-faint)"; }}
        >✕</button>
      </div>

      {/* ── Action bar ── */}
      <div className="att-actions">
        <ActionBtn onClick={() => { void handlePreview(); }} disabled={!selected}>Preview</ActionBtn>
        <ActionBtn onClick={() => { void handleSend(); }} disabled={!canSend} accent>
          {sending ? "…" : "Send"}
        </ActionBtn>
        {canAttach && (
          <ActionBtn onClick={handleAttach} accent>Attach</ActionBtn>
        )}
        {isCurrentlyAttached && (
          <ActionBtn onClick={handleRemove} danger>Remove</ActionBtn>
        )}
        <ActionBtn onClick={handleCopyPath} disabled={!selected}>Copy Path</ActionBtn>
      </div>

      {/* ── Selected path display ── */}
      {selected && (
        <div className="att-selected-path">
          <span className="att-selected-path-text">{selected.path}</span>
          {!isAlive && <span className="att-warn">start terminal first</span>}
        </div>
      )}

      {/* ── Preview area ── */}
      {(preview.loading || preview.content !== null || preview.error !== null) && (
        <div className="att-preview">
          <button
            onClick={() => setPreview(PREVIEW_IDLE)}
            title="Close preview"
            className="att-preview-close"
          >✕</button>
          {preview.loading && (
            <div style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: 10 }}>Loading…</div>
          )}
          {preview.error && (
            <div style={{ padding: "8px 12px", color: "var(--danger)", fontSize: 10 }}>{preview.error}</div>
          )}
          {preview.content !== null && !preview.loading && (
            <>
              {preview.truncated && (
                <div style={{ padding: "3px 12px", background: "var(--accent-soft)", color: "var(--warning)", fontSize: 9 }}>
                  truncated at 256 KB
                </div>
              )}
              <pre style={{
                margin: 0, padding: "8px 12px", color: "var(--text-main)",
                fontSize: 11, fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>{preview.content}</pre>
            </>
          )}
        </div>
      )}

      {/* ── Generated section ── */}
      {generatedOutputFiles.length > 0 && (
        <>
          <SectionLabel>Generated outputs</SectionLabel>
          {generatedOutputFiles.map((f) => {
            const isAttachedHere = attachedGenPathSet.has(f.path);
            const attId = groups.generated.find((a) => a.path === f.path)?.id ?? null;
            const isSelected = selected?.path === f.path;
            const owners = ownershipMap[f.path] ?? [];
            return (
              <FileRow
                key={f.path}
                fileName={f.fileName}
                isSelected={isSelected}
                isAttached={isAttachedHere}
                onClick={() => selectItem({
                  path: f.path,
                  fileName: f.fileName,
                  attachmentId: attId,
                  source: "generated",
                })}
                right={
                  <>
                    <KindBadge kind={f.kind} />
                    <OwnerBadge owners={owners} />
                  </>
                }
              />
            );
          })}
        </>
      )}

      {/* ── Uploaded section ── */}
      {groups.uploaded.length > 0 && (
        <>
          <SectionLabel>Attached files</SectionLabel>
          {groups.uploaded.map((att) => {
            const isSelected = selected?.path === att.path;
            return (
              <FileRow
                key={att.id}
                fileName={att.fileName}
                isSelected={isSelected}
                isAttached={true}
                onClick={() => selectItem({
                  path: att.path,
                  fileName: att.fileName,
                  attachmentId: att.id,
                  source: "user",
                })}
              />
            );
          })}
        </>
      )}

      {/* ── Preset Brains section ── */}
      {groups.preset.length > 0 && (
        <>
          <SectionLabel>Preset brains</SectionLabel>
          {groups.preset.map((att) => {
            const isSelected = selected?.path === att.path;
            return (
              <FileRow
                key={att.id}
                fileName={att.fileName}
                isSelected={isSelected}
                isAttached={true}
                onClick={() => selectItem({
                  path: att.path,
                  fileName: att.fileName,
                  attachmentId: att.id,
                  source: "preset",
                })}
                right={
                  <span style={{
                    fontSize: 8, fontWeight: 700, color: "var(--text-faint)",
                    background: "var(--button-bg)", padding: "1px 4px", borderRadius: 3,
                  }}>
                    BRAIN
                  </span>
                }
              />
            );
          })}
        </>
      )}

      {/* ── Empty state ── */}
      {generatedOutputFiles.length === 0 &&
        groups.uploaded.length === 0 &&
        groups.preset.length === 0 && (
        <div style={{
          padding: "18px 14px", color: "var(--text-faint)",
          fontSize: 11, textAlign: "center", lineHeight: 1.7,
        }}>
          No context attached yet.
          <br />
          <span style={{ fontSize: 10, opacity: 0.7 }}>
            Paste a .md or .txt path above, or generate a Memory Brief.
          </span>
        </div>
      )}
    </div>
  );
}
