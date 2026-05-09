import { useEffect, useState } from "react";
import type { GeneratedOutputFile } from "../domain/attachments";
import type { TerminalAttachment } from "../domain/orchestration";
import { groupOutputLibraryFiles } from "../domain/outputLibrary";
import { fileBridge } from "../orchestration/fileBridge";
import { deleteOutputFile } from "../memory/memoryBriefBridge";
import { ConfirmDialog } from "./ConfirmDialog";

const isTauri = Boolean(
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
);

function fmtSize(bytes: number): string {
  if (bytes < 1024)    return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000)     return "just now";
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function kindLabel(kind: GeneratedOutputFile["kind"]): string {
  if (kind === "memory_brief") return "MEM";
  if (kind === "transcript")   return "TXP";
  if (kind === "markdown")     return "MD";
  return "TXT";
}

function kindColor(kind: GeneratedOutputFile["kind"]): string {
  if (kind === "memory_brief") return "#c084fc";
  if (kind === "transcript")   return "#60a5fa";
  if (kind === "markdown")     return "#34d399";
  return "#9ca3af";
}

interface Props {
  outputFiles:      GeneratedOutputFile[];
  agents:           Array<{ id: string; label: string; attachments: TerminalAttachment[] }>;
  activeTerminalId: string | null;
  onAttach:         (agentId: string, path: string, source: "user" | "preset" | "generated") => void;
  onRefresh:        () => void;
  onClose:          () => void;
}

export function OutputLibraryDrawer({
  outputFiles,
  agents,
  activeTerminalId,
  onAttach,
  onRefresh,
  onClose,
}: Props) {
  const [selected,        setSelected]        = useState<GeneratedOutputFile | null>(null);
  const [previewContent,  setPreviewContent]  = useState<string | null>(null);
  const [previewLoading,  setPreviewLoading]  = useState(false);
  const [previewError,    setPreviewError]    = useState<string | null>(null);
  const [previewTruncated,setPreviewTruncated]= useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied-content" | "copied-path" | "error">("idle");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!selected) {
      setPreviewContent(null);
      setPreviewError(null);
      setPreviewTruncated(false);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewContent(null);
    setPreviewTruncated(false);

    fileBridge.readPreview(selected.path)
      .then((result) => {
        if (cancelled) return;
        setPreviewContent(result.content);
        setPreviewTruncated(result.truncated);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPreviewError(err instanceof Error ? err.message : "File missing or unreadable.");
      })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });

    return () => { cancelled = true; };
  }, [selected]);

  const attachedAgentLabels = selected
    ? agents.filter((a) => a.attachments.some((att) => att.path === selected.path)).map((a) => a.label)
    : [];

  const activeAgent   = agents.find((a) => a.id === activeTerminalId) ?? null;
  const alreadyAttached = Boolean(
    selected && activeAgent &&
    activeAgent.attachments.some((att) => att.path === selected.path),
  );
  const canAttach = Boolean(activeAgent && selected && !alreadyAttached);

  function handleAttach() {
    if (!activeAgent || !selected || alreadyAttached) return;
    onAttach(activeAgent.id, selected.path, "generated");
  }

  async function handleCopyContent() {
    if (!previewContent) return;
    try {
      await navigator.clipboard.writeText(previewContent);
      setCopyState("copied-content");
    } catch {
      setCopyState("error");
    }
    setTimeout(() => setCopyState("idle"), 1800);
  }

  function handleDeleteRequest() {
    if (!selected || !isTauri) return;
    setDeleteConfirm(true);
  }

  function handleDeleteConfirmed() {
    if (!selected) return;
    setDeleteConfirm(false);
    deleteOutputFile(selected.fileName)
      .then(() => {
        setSelected(null);
        setPreviewContent(null);
        setPreviewError(null);
        onRefresh();
      })
      .catch((err: unknown) => {
        setPreviewError(err instanceof Error ? err.message : "Delete failed.");
      });
  }

  async function handleCopyPath() {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.path);
      setCopyState("copied-path");
    } catch {
      setCopyState("error");
    }
    setTimeout(() => setCopyState("idle"), 1800);
  }

  const groups = groupOutputLibraryFiles(outputFiles);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.35)",
          zIndex: 200,
        }}
      />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 520,
        background: "var(--surface-1)",
        borderLeft: "1px solid var(--border-subtle)",
        display: "flex", flexDirection: "column",
        zIndex: 201,
        boxShadow: "-12px 0 32px rgba(0,0,0,0.28)",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "14px 16px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}>
          <span style={{
            flex: 1,
            fontWeight: 700, fontSize: 13, letterSpacing: 0.2,
            color: "var(--text-main)",
          }}>
            Output Library
          </span>
          <button
            className="cmd-pill-btn"
            style={{ fontSize: 11, padding: "3px 9px" }}
            onClick={onRefresh}
            title="Refresh output files"
          >
            Refresh
          </button>
          <button
            className="cmd-icon-btn"
            onClick={onClose}
            title="Close"
          >×</button>
        </div>

        {/* Body: two columns */}
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

          {/* File list — left */}
          <div style={{
            width: 190, flexShrink: 0,
            borderRight: "1px solid var(--border-subtle)",
            overflowY: "auto",
            padding: "8px 0 16px",
          }}>
            {outputFiles.length === 0 ? (
              <div style={{
                padding: "24px 12px", textAlign: "center",
                color: "var(--text-faint)", fontSize: 11,
              }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>◎</div>
                No generated files.
                <div style={{ marginTop: 8 }}>
                  <button
                    className="cmd-pill-btn"
                    style={{ fontSize: 10, padding: "3px 8px" }}
                    onClick={onRefresh}
                  >
                    Refresh
                  </button>
                </div>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.label}>
                  <div style={{
                    padding: "8px 12px 4px",
                    fontSize: 9, fontWeight: 700, letterSpacing: 0.8,
                    color: "var(--text-faint)", textTransform: "uppercase",
                  }}>
                    {group.label}
                  </div>
                  {group.files.map((file) => {
                    const isSelected = selected?.path === file.path;
                    const color = kindColor(file.kind);
                    return (
                      <button
                        key={file.path}
                        onClick={() => setSelected(file)}
                        title={file.path}
                        style={{
                          display: "block", width: "100%", textAlign: "left",
                          padding: "6px 12px",
                          background: isSelected
                            ? "var(--surface-2, rgba(255,255,255,0.06))"
                            : "transparent",
                          borderLeft: `2px solid ${isSelected ? color : "transparent"}`,
                          borderTop: "none", borderRight: "none", borderBottom: "none",
                          cursor: "pointer", fontFamily: "inherit",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected)
                            (e.currentTarget as HTMLButtonElement).style.background =
                              "var(--surface-2, rgba(255,255,255,0.03))";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected)
                            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                          <span style={{
                            fontSize: 8, fontWeight: 700, letterSpacing: 0.5,
                            color, background: `${color}18`,
                            border: `1px solid ${color}40`,
                            padding: "1px 4px", borderRadius: 999,
                            flexShrink: 0,
                          }}>
                            {kindLabel(file.kind)}
                          </span>
                          <span style={{
                            fontSize: 11, color: "var(--text-main)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            flex: 1,
                          }}>
                            {file.fileName}
                          </span>
                        </div>
                        <div style={{
                          fontSize: 9, color: "var(--text-faint)",
                          display: "flex", gap: 4,
                        }}>
                          <span>{fmtSize(file.sizeBytes)}</span>
                          <span>·</span>
                          <span>{relTime(file.modifiedAt)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Preview — right */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            minWidth: 0, minHeight: 0,
          }}>
            {!selected ? (
              <div style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-faint)", fontSize: 12, padding: 24, textAlign: "center",
              }}>
                Select a file to preview
              </div>
            ) : (
              <>
                {/* Action bar */}
                <div style={{
                  padding: "10px 14px 8px",
                  borderBottom: "1px solid var(--border-subtle)",
                  flexShrink: 0,
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: "var(--text-main)",
                    marginBottom: 6,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {selected.fileName}
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    <button
                      className="cmd-pill-btn"
                      style={{ fontSize: 10, padding: "3px 8px" }}
                      onClick={handleAttach}
                      disabled={!canAttach}
                      title={
                        !activeAgent      ? "No active agent" :
                        alreadyAttached   ? "Already attached to active agent" :
                        `Attach to ${activeAgent.label}`
                      }
                    >
                      {alreadyAttached
                        ? "Attached"
                        : activeAgent
                        ? `Attach → ${activeAgent.label}`
                        : "Attach"}
                    </button>
                    <button
                      className="cmd-pill-btn"
                      style={{ fontSize: 10, padding: "3px 8px" }}
                      onClick={() => { void handleCopyContent(); }}
                      disabled={!previewContent}
                      title="Copy preview content to clipboard"
                    >
                      {copyState === "copied-content" ? "Copied!" : "Copy Content"}
                    </button>
                    <button
                      className="cmd-pill-btn"
                      style={{ fontSize: 10, padding: "3px 8px" }}
                      onClick={() => { void handleCopyPath(); }}
                      title="Copy file path to clipboard"
                    >
                      {copyState === "copied-path" ? "Copied!" : "Copy Path"}
                    </button>
                    {isTauri && (
                      <button
                        className="cmd-pill-btn cmd-pill-btn--danger"
                        style={{ fontSize: 10, padding: "3px 8px", marginLeft: "auto" }}
                        onClick={handleDeleteRequest}
                        title="Delete this output file"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  {copyState === "error" && (
                    <div style={{ fontSize: 9, color: "var(--danger, #f87171)", marginTop: 4 }}>
                      Clipboard unavailable
                    </div>
                  )}
                </div>

                {/* Preview body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
                  {previewLoading && (
                    <div style={{ color: "var(--text-faint)", fontSize: 11 }}>Loading…</div>
                  )}
                  {previewError && !previewLoading && (
                    <div style={{ color: "var(--danger, #f87171)", fontSize: 11, padding: "10px 0" }}>
                      {previewError}
                    </div>
                  )}
                  {previewContent && !previewLoading && (
                    <>
                      {previewTruncated && (
                        <div style={{
                          fontSize: 9, color: "var(--text-faint)",
                          marginBottom: 8, fontStyle: "italic",
                        }}>
                          Truncated at 256 KiB
                        </div>
                      )}
                      <pre style={{
                        margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word",
                        fontSize: 11, lineHeight: 1.6,
                        color: "var(--text-main)", fontFamily: "inherit",
                      }}>
                        {previewContent}
                      </pre>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        {outputFiles.length > 0 && (
          <div style={{
            padding: "8px 16px",
            borderTop: "1px solid var(--border-subtle)",
            fontSize: 10, color: "var(--text-faint)",
            flexShrink: 0,
          }}>
            {outputFiles.length} file{outputFiles.length !== 1 ? "s" : ""} generated
          </div>
        )}
      </div>
      {deleteConfirm && selected && (
        <ConfirmDialog
          title="Delete output file?"
          body={[
            `This deletes "${selected.fileName}" from the local outputs folder.`,
            attachedAgentLabels.length > 0
              ? ` This output is currently attached to ${attachedAgentLabels.length} agent${attachedAgentLabels.length !== 1 ? "s" : ""} (${attachedAgentLabels.join(", ")}). Deleting the file will not automatically remove the attachment reference.`
              : "",
          ].join("")}
          confirmLabel="Delete"
          destructive
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setDeleteConfirm(false)}
        />
      )}
    </>
  );
}
