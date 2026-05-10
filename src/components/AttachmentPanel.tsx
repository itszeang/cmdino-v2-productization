import { useState, useMemo, useEffect } from "react";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { attachmentKindFromPath } from "../domain/orchestration";
import { groupAttachments, buildOwnershipMap, inferAttachmentSource } from "../domain/attachments";
import { kindReadableLabel, kindPurposeHint } from "../domain/outputLibrary";
import { PRESET_BRAINS } from "../config/presetBrains";
import { fileBridge } from "../orchestration/fileBridge";
import { MarkdownArtifactReader } from "./MarkdownArtifactReader";
import { ArtifactReaderModal } from "./ArtifactReaderModal";
import type { ArtifactReaderAction } from "./ArtifactReaderModal";
import type { TerminalAgent } from "../domain/terminalAgent";
import type { GeneratedOutputFile } from "../domain/attachments";

// ── Types ─────────────────────────────────────────────────────────────────────

type SourceTab = "output_shelf" | "starter_context" | "local_file" | "added_context";

interface PreviewState {
  content:   string | null;
  truncated: boolean;
  loading:   boolean;
  error:     string | null;
}
const PREVIEW_IDLE: PreviewState = { content: null, truncated: false, loading: false, error: null };

interface ContextCandidate {
  path:         string;
  fileName:     string;
  displayTitle: string;
  artifactType: string;
  sourceLabel:  string;
  purposeHint:  string;
  attachmentId: string | null;
  source:       "user" | "preset" | "generated";
  owners:       string[];
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

// ── Tauri detection ───────────────────────────────────────────────────────────

const isTauri = Boolean(
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
);

// ── Small primitive ───────────────────────────────────────────────────────────

function ActionBtn({ onClick, disabled = false, accent = false, danger = false, children }: {
  onClick: () => void; disabled?: boolean; accent?: boolean; danger?: boolean;
  children: React.ReactNode;
}) {
  const baseColor  = disabled ? "var(--text-faint)" : danger ? "var(--danger)" : accent ? "var(--text-main)" : "var(--text-muted)";
  const baseBorder = disabled ? "transparent" : accent ? "var(--border-strong)" : "var(--border-subtle)";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "transparent", border: `1px solid ${baseBorder}`,
        color: baseColor, fontSize: 10, padding: "3px 8px", borderRadius: 999,
        fontFamily: "inherit", fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        flexShrink: 0, whiteSpace: "nowrap",
        transition: "background 0.1s, color 0.1s, border-color 0.1s",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background  = "var(--button-hover)";
        b.style.color       = danger ? "var(--danger)" : "var(--text-main)";
        b.style.borderColor = "var(--border-strong)";
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

// ── Main component ────────────────────────────────────────────────────────────

export function AttachmentPanel({
  agent, allAgents, generatedOutputFiles, isAlive,
  onAddAttachment, onRemoveAttachment, onSendAttachment,
  onRefreshGeneratedOutputs, onClose,
}: Props) {
  const atts = agent.attachments ?? [];

  const [activeTab, setActiveTab] = useState<SourceTab>(() =>
    generatedOutputFiles.length > 0 ? "output_shelf" : "starter_context"
  );
  const [selected,  setSelected]  = useState<ContextCandidate | null>(null);
  const [preview,   setPreview]   = useState<PreviewState>(PREVIEW_IDLE);
  const [addInput,  setAddInput]  = useState("");
  const [addError,  setAddError]  = useState("");
  const [sending,    setSending]    = useState(false);
  const [copyState,  setCopyState]  = useState<"idle" | "copied" | "error">("idle");
  const [showReader, setShowReader] = useState(false);

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

  // ── Candidate builders ────────────────────────────────────────────────────

  const outputShelfCandidates = useMemo((): ContextCandidate[] =>
    generatedOutputFiles.map((f) => ({
      path:         f.path,
      fileName:     f.fileName,
      displayTitle: f.fileName,
      artifactType: kindReadableLabel(f.kind),
      sourceLabel:  "Output Shelf",
      purposeHint:  kindPurposeHint(f.kind),
      attachmentId: groups.generated.find((a) => a.path === f.path)?.id ?? null,
      source:       "generated" as const,
      owners:       ownershipMap[f.path] ?? [],
    })),
    [generatedOutputFiles, groups.generated, ownershipMap],
  );

  const starterCandidates = useMemo((): ContextCandidate[] =>
    PRESET_BRAINS.map((brain) => ({
      path:         brain.path,
      fileName:     brain.fileName,
      displayTitle: brain.title,
      artifactType: "Starter Context",
      sourceLabel:  "Starter Context",
      purposeHint:  brain.description,
      attachmentId: groups.preset.find((a) => a.path === brain.path)?.id ?? null,
      source:       "preset" as const,
      owners:       ownershipMap[brain.path] ?? [],
    })),
    [groups.preset, ownershipMap],
  );

  const addedContextCandidates = useMemo((): ContextCandidate[] =>
    atts.map((att) => {
      const src = att.source ?? inferAttachmentSource(att.path, generatedPaths);
      let artifactType = "Local File";
      let purposeHint  = "Your own context file from disk.";
      let sourceLabel  = "Local File";

      if (src === "preset") {
        const brain = PRESET_BRAINS.find((b) => b.path === att.path);
        artifactType = "Starter Context";
        purposeHint  = brain?.description ?? "Reusable role instructions for this agent type.";
        sourceLabel  = "Starter Context";
      } else if (src === "generated") {
        const genFile = generatedOutputFiles.find((f) => f.path === att.path);
        artifactType = genFile ? kindReadableLabel(genFile.kind) : "Generated File";
        purposeHint  = genFile ? kindPurposeHint(genFile.kind) : "Previously generated output.";
        sourceLabel  = "Output Shelf";
      }

      return {
        path:         att.path,
        fileName:     att.fileName,
        displayTitle: att.fileName,
        artifactType,
        sourceLabel,
        purposeHint,
        attachmentId: att.id,
        source:       src,
        owners:       ownershipMap[att.path] ?? [],
      };
    }),
    [atts, generatedPaths, generatedOutputFiles, ownershipMap],
  );

  function listForTab(tab: SourceTab): ContextCandidate[] {
    if (tab === "output_shelf")    return outputShelfCandidates;
    if (tab === "starter_context") return starterCandidates;
    if (tab === "added_context")   return addedContextCandidates;
    return [];
  }

  // ── Auto-preview on selection ──────────────────────────────────────────────

  useEffect(() => {
    if (!selected) { setPreview(PREVIEW_IDLE); return; }
    let cancelled = false;
    setPreview({ content: null, truncated: false, loading: true, error: null });
    fileBridge.readPreview(selected.path)
      .then((r) => {
        if (cancelled) return;
        setPreview({ content: r.content, truncated: r.truncated, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPreview({ content: null, truncated: false, loading: false,
          error: err instanceof Error ? err.message : "File missing or unreadable." });
      });
    return () => { cancelled = true; };
  }, [selected]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const isAttached = selected !== null && selected.attachmentId !== null;
  const canAdd     = selected !== null && !isAttached;
  const canSend    = isAttached && isAlive && !sending;
  const canCopy    = selected !== null;

  const terminalStateHint = !isAlive
    ? "Start this agent before sending context."
    : isAttached
    ? "Send Into Agent will paste this file's text into the terminal."
    : "Add to Agent keeps this file available here. It is not sent yet.";

  // ── Actions ───────────────────────────────────────────────────────────────

  function handleSelect(c: ContextCandidate) {
    setSelected((prev) => prev?.path === c.path ? null : c);
  }

  function handleAdd() {
    if (!selected || isAttached) return;
    onAddAttachment(selected.path, selected.source);
    setActiveTab("added_context");
  }

  async function handleSend() {
    if (!canSend || !selected) return;
    setSending(true);
    try { await onSendAttachment(selected.path, selected.fileName); }
    finally { setSending(false); }
  }

  function handleRemove() {
    if (!selected?.attachmentId) return;
    onRemoveAttachment(selected.attachmentId);
    setSelected(null);
  }

  async function handleCopyPath() {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.path);
      setCopyState("copied");
    } catch { setCopyState("error"); }
    setTimeout(() => setCopyState("idle"), 1800);
  }

  function handleAddPath() {
    const p = addInput.trim();
    if (!p) return;
    if (!attachmentKindFromPath(p)) { setAddError("Only .md and .txt files allowed."); return; }
    onAddAttachment(p, "user");
    setAddInput("");
    setAddError("");
    setActiveTab("added_context");
  }

  async function handleChooseFile() {
    if (!isTauri) return;
    try {
      const result = await openFileDialog({
        multiple: false,
        filters: [{ name: "Context Files", extensions: ["md", "txt"] }],
      });
      if (typeof result === "string" && result.trim()) {
        setAddInput(result.trim());
        setAddError("");
      }
    } catch {
      // user cancelled — ignore
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const TABS: { id: SourceTab; label: string }[] = [
    { id: "output_shelf",    label: `Output Shelf${generatedOutputFiles.length > 0 ? ` (${generatedOutputFiles.length})` : ""}` },
    { id: "starter_context", label: "Starter Context" },
    { id: "local_file",      label: "Local File" },
    { id: "added_context",   label: `Added (${atts.length})` },
  ];

  const TAB_PURPOSE: Record<SourceTab, string> = {
    output_shelf:    "Generated files from your previous work.",
    starter_context: "Role instructions and reusable agent brains.",
    local_file:      "Add your own .md or .txt file.",
    added_context:   "Files already attached to this agent.",
  };

  const activeList = listForTab(activeTab);

  const selectedIsLog = selected !== null &&
    selected.source === "generated" &&
    generatedOutputFiles.find((f) => f.path === selected.path)?.kind === "transcript";

  const readerActions: ArtifactReaderAction[] = selected ? [
    ...(canAdd ? [{ label: "Add to Agent", onClick: handleAdd, accent: true, disabled: false }] : []),
    { label: sending ? "…" : "Send Into Agent", onClick: () => { void handleSend(); }, disabled: !canSend, accent: canSend },
    ...(selected.attachmentId !== null ? [{ label: "Remove from Agent", onClick: handleRemove, danger: true }] : []),
    { label: copyState === "copied" ? "Copied!" : copyState === "error" ? "Error" : "Copy File Path", onClick: () => { void handleCopyPath(); }, disabled: !canCopy },
  ] : [];

  return (
    <>
    {showReader && selected && (
      <ArtifactReaderModal
        title={selected.source === "preset" ? selected.displayTitle : selected.fileName}
        artifactType={selected.artifactType}
        sourceLabel={selected.sourceLabel}
        path={selected.source !== "preset" ? selected.path : undefined}
        isAttached={selected.attachmentId !== null}
        content={preview.content}
        truncated={preview.truncated}
        loading={preview.loading}
        error={preview.error}
        isLog={selectedIsLog}
        actions={readerActions}
        onClose={() => setShowReader(false)}
      />
    )}
    <div className="att-panel">

      {/* ── Header ── */}
      <div className="att-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: 3, padding: "8px 12px 7px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="att-header-name">Add Context to {agent.label}</span>
            {atts.length > 0 && (
              <span style={{ fontSize: 9, color: "var(--text-faint)", fontWeight: 400 }}>
                {atts.length} attached
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            <button
              onClick={onRefreshGeneratedOutputs}
              title="Refresh generated outputs"
              style={{ background: "transparent", border: "none", color: "var(--text-faint)", fontSize: 12, cursor: "pointer", padding: "1px 5px", borderRadius: 4, lineHeight: 1 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-faint)"; }}
            >↻</button>
            <button
              onClick={onClose}
              title="Close"
              style={{ background: "transparent", border: "none", color: "var(--text-faint)", fontSize: 12, cursor: "pointer", padding: "1px 5px", borderRadius: 4, lineHeight: 1 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-faint)"; }}
            >✕</button>
          </div>
        </div>
        <span style={{ fontSize: 9, color: "var(--text-faint)", lineHeight: 1.4 }}>
          Add files first. Nothing is sent into the terminal until you choose Send Into Agent.
        </span>
      </div>

      {/* ── Source tabs ── */}
      <div className="att-v2-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`att-v2-tab${activeTab === tab.id ? " att-v2-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Purpose line ── */}
      <div style={{
        padding: "3px 10px 4px",
        fontSize: 9, color: "var(--text-faint)",
        background: "var(--surface-1)",
        borderBottom: "1px solid var(--border-subtle)",
        flexShrink: 0, lineHeight: 1.4,
      }}>
        {TAB_PURPOSE[activeTab]}
      </div>

      {/* ── Two-column body ── */}
      <div className="att-v2-body">

        {/* Left: list or local-file input */}
        <div className="att-v2-list">
          {activeTab === "local_file" ? (
            <div style={{ padding: "10px 10px" }}>
              {/* File picker — Tauri desktop only */}
              {isTauri ? (
                <>
                  <button
                    onClick={() => { void handleChooseFile(); }}
                    style={{
                      width: "100%", marginBottom: 6,
                      background: "var(--button-bg)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-main)",
                      fontSize: 10, fontWeight: 600, padding: "6px 0",
                      borderRadius: 6, fontFamily: "inherit",
                      cursor: "pointer", transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--button-hover)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--button-bg)"; }}
                  >
                    Choose File…
                  </button>
                  <div style={{ fontSize: 9, color: "var(--text-faint)", marginBottom: 6, textAlign: "center", opacity: 0.7 }}>
                    or paste path below
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 9, color: "var(--text-faint)", marginBottom: 6, lineHeight: 1.5 }}>
                  Paste an absolute file path. Supports .md and .txt files.
                </div>
              )}
              <input
                autoFocus={!isTauri}
                value={addInput}
                onChange={(e) => { setAddInput(e.target.value); setAddError(""); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter")  handleAddPath();
                  if (e.key === "Escape") onClose();
                }}
                placeholder="/path/to/context.md"
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "var(--surface-0)",
                  border: `1px solid ${addError ? "var(--danger)" : "var(--border-subtle)"}`,
                  color: "var(--text-main)", fontSize: 10, padding: "5px 8px",
                  borderRadius: 6, fontFamily: "monospace", outline: "none",
                }}
              />
              {addError && (
                <div style={{ fontSize: 9, color: "var(--danger)", marginTop: 4 }}>{addError}</div>
              )}
              <button
                onClick={handleAddPath}
                disabled={!addInput.trim()}
                style={{
                  marginTop: 7, width: "100%",
                  background: addInput.trim() ? "var(--accent)" : "var(--button-bg)",
                  border: "1px solid transparent",
                  color: addInput.trim() ? "var(--app-bg)" : "var(--text-faint)",
                  fontSize: 10, fontWeight: 600, padding: "5px 0",
                  borderRadius: 6, fontFamily: "inherit",
                  cursor: addInput.trim() ? "pointer" : "not-allowed",
                  transition: "opacity 0.1s",
                }}
                onMouseEnter={(e) => { if (addInput.trim()) (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
              >
                Add File
              </button>
            </div>
          ) : activeList.length === 0 ? (
            <div className="att-v2-empty">
              {activeTab === "output_shelf" && (
                <>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>◎</div>
                  No generated files yet.
                  <div style={{ marginTop: 6, fontSize: 9, opacity: 0.7 }}>
                    Save a Memory Brief or export logs from the Outputs section.
                  </div>
                </>
              )}
              {activeTab === "starter_context" && <>No starter brains found.</>}
              {activeTab === "added_context" && (
                <>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>○</div>
                  Nothing attached yet.
                  <div style={{ marginTop: 6, fontSize: 9, opacity: 0.7 }}>
                    Add files from Output Shelf, Starter Context, or Local File.
                  </div>
                </>
              )}
            </div>
          ) : (
            activeList.map((c) => {
              const isSel = selected?.path === c.path;
              const isAtt = c.attachmentId !== null;
              return (
                <button
                  key={c.path}
                  className={`att-v2-row${isSel ? " att-v2-row--selected" : ""}`}
                  onClick={() => handleSelect(c)}
                  title={c.path}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 9, fontWeight: 600, letterSpacing: 0.2,
                      color: isAtt ? "var(--success)" : "var(--text-faint)",
                    }}>
                      {c.artifactType}
                    </span>
                    {isAtt && (
                      <span style={{
                        fontSize: 8, fontWeight: 700,
                        background: "rgba(134,239,172,0.12)",
                        color: "var(--success)",
                        padding: "1px 4px", borderRadius: 3,
                      }}>
                        attached
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 10, color: "var(--text-main)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    fontFamily: c.source === "preset" ? "inherit" : "monospace",
                  }}>
                    {c.source === "preset" ? c.displayTitle : c.fileName}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right: detail top (non-scroll) + preview (scrolls) */}
        <div className="att-v2-detail">
          {!selected ? (
            <div style={{
              height: "100%", display: "flex", alignItems: "center",
              justifyContent: "center", textAlign: "center",
              padding: 16, color: "var(--text-faint)", fontSize: 10, lineHeight: 1.6,
            }}>
              {activeTab === "local_file"
                ? "Add a local file path on the left."
                : "Select a file to see details and actions."}
            </div>
          ) : (
            <>
              {/* Fixed top: identity + state + actions — always visible */}
              <div className="att-v2-detail-top">

                {/* File identity + state */}
                <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div style={{
                    fontSize: 11, fontWeight: 650, color: "var(--text-main)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    marginBottom: 4,
                    fontFamily: selected.source === "preset" ? "inherit" : "monospace",
                  }}>
                    {selected.source === "preset" ? selected.displayTitle : selected.fileName}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 600, background: "var(--button-bg)",
                      color: "var(--text-muted)", padding: "1px 5px", borderRadius: 3,
                    }}>
                      {selected.artifactType}
                    </span>
                    <span style={{
                      fontSize: 9, color: "var(--text-faint)",
                      padding: "1px 5px", borderRadius: 3,
                      border: "1px solid var(--border-subtle)",
                    }}>
                      {selected.sourceLabel}
                    </span>
                    {selected.attachmentId !== null ? (
                      <span style={{
                        fontSize: 9, fontWeight: 600,
                        background: "rgba(134,239,172,0.12)",
                        color: "var(--success)", padding: "1px 5px", borderRadius: 3,
                      }}>
                        ✓ Attached
                      </span>
                    ) : (
                      <span style={{
                        fontSize: 9, color: "var(--text-faint)",
                        padding: "1px 5px", borderRadius: 3,
                        border: "1px solid var(--border-subtle)",
                      }}>
                        Not attached
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 9, color: "var(--text-faint)", lineHeight: 1.5, marginBottom: 4 }}>
                    {selected.purposeHint}
                  </div>

                  <div style={{
                    fontSize: 9, fontStyle: "italic", lineHeight: 1.4,
                    color: !isAlive
                      ? "var(--warning, #fbbf24)"
                      : isAttached ? "var(--success)" : "var(--text-faint)",
                  }}>
                    {terminalStateHint}
                  </div>

                  {selected.owners.filter((o) => o !== agent.label).length > 0 && (
                    <div style={{ fontSize: 9, color: "var(--text-faint)", marginTop: 3 }}>
                      Also attached to: {selected.owners.filter((o) => o !== agent.label).join(", ")}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{
                  display: "flex", gap: 4, flexWrap: "wrap",
                  padding: "6px 12px",
                  borderBottom: "1px solid var(--border-subtle)",
                }}>
                  {canAdd && (
                    <ActionBtn onClick={handleAdd} accent>Add to Agent</ActionBtn>
                  )}
                  <ActionBtn
                    onClick={() => { void handleSend(); }}
                    disabled={!canSend}
                    accent={canSend}
                  >
                    {sending ? "…" : "Send Into Agent"}
                  </ActionBtn>
                  {selected.attachmentId !== null && (
                    <ActionBtn onClick={handleRemove} danger>Remove from Agent</ActionBtn>
                  )}
                  <ActionBtn
                    onClick={() => { void handleCopyPath(); }}
                    disabled={!canCopy}
                  >
                    {copyState === "copied" ? "Copied!" : copyState === "error" ? "Error" : "Copy File Path"}
                  </ActionBtn>
                </div>
              </div>

              {/* Preview bar */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "3px 12px",
                borderBottom: "1px solid var(--border-subtle)",
                flexShrink: 0, background: "var(--surface-1)",
              }}>
                <span style={{ fontSize: 9, color: "var(--text-faint)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" as const }}>
                  Preview
                </span>
                {(preview.content !== null || preview.loading) && (
                  <button
                    onClick={() => setShowReader(true)}
                    style={{
                      background: "transparent", border: "1px solid var(--border-subtle)",
                      color: "var(--text-muted)", fontSize: 9, padding: "2px 7px", borderRadius: 999,
                      fontFamily: "inherit", fontWeight: 600, cursor: "pointer",
                      transition: "background 0.1s, color 0.1s",
                    }}
                    onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "var(--button-hover)"; b.style.color = "var(--text-main)"; }}
                    onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "transparent"; b.style.color = "var(--text-muted)"; }}
                  >
                    Open Reader
                  </button>
                )}
              </div>

              {/* Compact inline preview */}
              <div className="att-v2-preview-scroll">
                {preview.loading && (
                  <div style={{ padding: "8px 12px", color: "var(--text-faint)", fontSize: 10 }}>Loading…</div>
                )}
                {preview.error && !preview.loading && (
                  <div style={{ padding: "8px 12px", color: "var(--danger)", fontSize: 10, lineHeight: 1.5 }}>
                    {preview.error}
                  </div>
                )}
                {preview.content !== null && !preview.loading && (
                  <>
                    {preview.truncated && (
                      <div style={{ padding: "3px 12px", background: "var(--accent-soft)", color: "var(--warning)", fontSize: 9 }}>
                        Truncated — Open Reader to see full content
                      </div>
                    )}
                    <MarkdownArtifactReader
                      content={preview.content}
                      isLog={
                        selected.source === "generated" &&
                        generatedOutputFiles.find((f) => f.path === selected.path)?.kind === "transcript"
                      }
                    />
                  </>
                )}
                {!preview.loading && !preview.error && preview.content === null && (
                  <div style={{ padding: "8px 12px", color: "var(--text-faint)", fontSize: 10, fontStyle: "italic" }}>
                    No preview available.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
