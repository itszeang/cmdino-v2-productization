import { useEffect, useMemo, useState } from "react";
import type { GeneratedOutputFile } from "../domain/attachments";
import type { TerminalAttachment } from "../domain/orchestration";
import {
  artifactColor,
  artifactPurposeHint,
  buildEditedOutputVersionFileName,
  getOutputVersionMetadata,
  groupOutputLibraryFiles,
  isEditableOutputArtifact,
  kindReadableLabel,
  outputFileDisplayLabel,
  outputVersionLabel,
} from "../domain/outputLibrary";
import type { WorkflowRunHistoryEntry } from "../domain/workflowRunHistory";
import { fileBridge } from "../orchestration/fileBridge";
import { deleteOutputFile, writeOutputFiles } from "../memory/memoryBriefBridge";
import { ConfirmDialog } from "./ConfirmDialog";
import { MarkdownArtifactReader } from "./MarkdownArtifactReader";
import { ArtifactReaderModal } from "./ArtifactReaderModal";
import type { ArtifactReaderAction } from "./ArtifactReaderModal";

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

interface Props {
  outputFiles:         GeneratedOutputFile[];
  agents:              Array<{ id: string; label: string; attachments: TerminalAttachment[] }>;
  activeTerminalId:    string | null;
  workflowRunEntries?: WorkflowRunHistoryEntry[];
  onAttach:            (agentId: string, path: string, source: "user" | "preset" | "generated") => void;
  onRefresh:           () => void;
  onClose:             () => void;
}

export function OutputLibraryDrawer({
  outputFiles,
  agents,
  activeTerminalId,
  workflowRunEntries = [],
  onAttach,
  onRefresh,
  onClose,
}: Props) {
  const [selected,        setSelected]        = useState<GeneratedOutputFile | null>(null);
  const [previewContent,  setPreviewContent]  = useState<string | null>(null);
  const [previewLoading,  setPreviewLoading]  = useState(false);
  const [previewError,    setPreviewError]    = useState<string | null>(null);
  const [previewTruncated,setPreviewTruncated]= useState(false);
  const [copyState,    setCopyState]    = useState<"idle" | "copied-content" | "copied-path" | "error">("idle");
  const [deleteConfirm,setDeleteConfirm]= useState(false);
  const [showReader,   setShowReader]   = useState(false);
  const [versionNotice,setVersionNotice]= useState("");

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
    setVersionNotice("");

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
  const canEditSelected = Boolean(selected && previewContent !== null && isEditableOutputArtifact(selected));

  const artifactRunMap = useMemo(() => {
    const map = new Map<string, WorkflowRunHistoryEntry>();
    for (const entry of workflowRunEntries) {
      for (const p of entry.artifactPaths ?? []) {
        const name = (p.split(/[/\\]/).pop() ?? p).toLowerCase();
        if (!map.has(name)) map.set(name, entry);
      }
    }
    return map;
  }, [workflowRunEntries]);

  const sourceRun = selected ? (artifactRunMap.get(selected.fileName.toLowerCase()) ?? null) : null;

  function handleAttach() {
    if (!activeAgent || !selected || alreadyAttached) return;
    onAttach(activeAgent.id, selected.path, "generated");
  }

  async function handleSaveEditedArtifact(content: string): Promise<{ ok: boolean; message: string }> {
    if (!selected || !isTauri) {
      return { ok: false, message: "Saving edited artifacts requires the desktop app." };
    }
    if (!isEditableOutputArtifact(selected)) {
      return { ok: false, message: "This artifact type is read-only." };
    }
    const fileName = buildEditedOutputVersionFileName(
      selected.fileName,
      outputFiles.map((file) => file.fileName),
    );
    try {
      const result = await writeOutputFiles([{ fileName, content }]);
      if (result.count === 0) {
        return { ok: false, message: "Edited artifact was not saved." };
      }
      setVersionNotice(`Saved ${fileName}. Refreshing Output Shelf.`);
      onRefresh();
      return { ok: true, message: `Saved new version: ${fileName}` };
    } catch (err) {
      return {
        ok: false,
        message: `Could not save edited version: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
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
      <div className="output-overlay" onClick={onClose} />

      {/* Drawer */}
      <div className="output-drawer">

        {/* Header */}
        <div className="output-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cmdino-panel-title" style={{ flex: "unset" }}>Output Shelf</div>
            <div className="cmdino-panel-subtitle">Workflow results, memory briefs, build notes, and terminal logs.</div>
          </div>
          <button
            className="cmdino-action-btn cmdino-action-btn--ghost"
            style={{ fontSize: 10, padding: "4px 9px" }}
            onClick={onRefresh}
            title="Refresh output files"
          >
            Refresh
          </button>
          <button className="cmdino-close-btn" onClick={onClose} title="Close">✕</button>
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
                  <div style={{ padding: "10px 12px 2px" }}>
                    <div style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: 0.8,
                      color: "var(--text-faint)", textTransform: "uppercase",
                    }}>
                      {group.label}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--text-faint)", opacity: 0.7, marginTop: 1 }}>
                      {group.hint}
                    </div>
                  </div>
                  {group.files.map((file) => {
                    const isSelected = selected?.path === file.path;
                    const color = artifactColor(file);
                    const fileRun = artifactRunMap.get(file.fileName.toLowerCase());
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
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: 0.2, color,
                          }}>
                            {outputFileDisplayLabel(file)}
                          </span>
                          {getOutputVersionMetadata(file.fileName).isEditedVersion && (
                            <span style={{
                              fontSize: 8, color: "var(--text-faint)",
                              border: "1px solid var(--border-subtle)",
                              borderRadius: 3, padding: "0 3px",
                            }}>
                              edited
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: 11, color: "var(--text-main)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          marginBottom: 2,
                        }}>
                          {file.fileName}
                        </div>
                        {fileRun && (
                          <div style={{
                            fontSize: 9, color: "var(--accent)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            marginBottom: 2,
                          }}>
                            {fileRun.userTask || "Untitled workflow"}
                          </div>
                        )}
                        <div style={{
                          fontSize: 9, color: "var(--text-faint)",
                          display: "flex", gap: 4,
                        }}>
                          <span>{relTime(file.modifiedAt)}</span>
                          <span>·</span>
                          <span>{fmtSize(file.sizeBytes)}</span>
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
                    marginBottom: 2,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {selected.fileName}
                  </div>
                  <div style={{
                    fontSize: 9, color: "var(--text-faint)", marginBottom: 6, lineHeight: 1.4,
                  }}>
                    <span style={{ color: artifactColor(selected), fontWeight: 600 }}>
                      {outputFileDisplayLabel(selected)}
                    </span>
                    {" · "}
                    {kindReadableLabel(selected.kind)} · {relTime(selected.modifiedAt)} · {fmtSize(selected.sizeBytes)}
                    {getOutputVersionMetadata(selected.fileName).isEditedVersion
                      ? ` · ${outputVersionLabel(selected.fileName)}`
                      : ""}
                    <span style={{ display: "block", marginTop: 2, fontStyle: "italic" }}>
                      {artifactPurposeHint(selected)}
                    </span>
                  </div>
                  {sourceRun && (
                    <div style={{
                      fontSize: 9, color: "var(--accent)", marginBottom: 6,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                      title={`From workflow run: ${sourceRun.id}`}
                    >
                      From workflow: {sourceRun.userTask || "Untitled workflow"}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    <button
                      className="cmd-pill-btn"
                      style={{ fontSize: 10, padding: "3px 8px" }}
                      onClick={handleAttach}
                      disabled={!canAttach}
                      title={
                        !activeAgent      ? "No active agent" :
                        alreadyAttached   ? "Already added to active agent" :
                        `Add to ${activeAgent.label}`
                      }
                    >
                      {alreadyAttached
                        ? "Added"
                        : activeAgent
                        ? `Add to ${activeAgent.label} Context`
                        : "Add to Context"}
                    </button>
                    <button
                      className="cmd-pill-btn"
                      style={{ fontSize: 10, padding: "3px 8px" }}
                      onClick={() => { void handleCopyContent(); }}
                      disabled={!previewContent}
                      title="Copy text to clipboard"
                    >
                      {copyState === "copied-content" ? "Copied!" : "Copy Text"}
                    </button>
                    <button
                      className="cmd-pill-btn"
                      style={{ fontSize: 10, padding: "3px 8px" }}
                      onClick={() => { void handleCopyPath(); }}
                      title="Copy file path to clipboard"
                    >
                      {copyState === "copied-path" ? "Copied!" : "Copy File Path"}
                    </button>
                    <button
                      className="cmd-pill-btn"
                      style={{ fontSize: 10, padding: "3px 8px" }}
                      onClick={() => setShowReader(true)}
                      disabled={!previewContent && !previewLoading}
                      title="Open full artifact reader"
                    >
                      Open Reader
                    </button>
                    {canEditSelected && (
                      <button
                        className="cmd-pill-btn"
                        style={{ fontSize: 10, padding: "3px 8px" }}
                        onClick={() => setShowReader(true)}
                        title="Open full artifact reader and use Edit mode"
                      >
                        Edit
                      </button>
                    )}
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
                  {versionNotice && (
                    <div style={{ fontSize: 9, color: "var(--success)", marginTop: 4 }}>
                      {versionNotice}
                    </div>
                  )}
                </div>

                {/* Preview body */}
                <div style={{ flex: 1, overflowY: "auto" }}>
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
                          marginBottom: 4, fontStyle: "italic",
                        }}>
                          Truncated at 256 KiB
                        </div>
                      )}
                      <MarkdownArtifactReader
                        content={previewContent}
                        isLog={selected?.kind === "transcript" || selected?.kind === "text"}
                      />
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        {outputFiles.length > 0 && (
          <div className="output-footer">
            {outputFiles.length} artifact{outputFiles.length !== 1 ? "s" : ""} on shelf · local only, not synced
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
      {showReader && selected && (() => {
        const readerActions: ArtifactReaderAction[] = [
          {
            label: alreadyAttached ? "Added" : activeAgent ? `Add to ${activeAgent.label} Context` : "Add to Context",
            onClick: handleAttach,
            disabled: !canAttach,
            accent: canAttach,
          },
          {
            label: copyState === "copied-content" ? "Copied!" : "Copy Text",
            onClick: () => { void handleCopyContent(); },
            disabled: !previewContent,
          },
          {
            label: copyState === "copied-path" ? "Copied!" : "Copy File Path",
            onClick: () => { void handleCopyPath(); },
          },
        ];
        return (
          <ArtifactReaderModal
            title={selected.fileName}
            artifactType={outputFileDisplayLabel(selected)}
            sourceLabel="Output Shelf"
            path={selected.path}
            isAttached={alreadyAttached}
            content={previewContent}
            truncated={previewTruncated}
            loading={previewLoading}
            error={previewError}
            isLog={selected.kind === "transcript" || selected.kind === "text"}
            editable={canEditSelected}
            onSaveEdit={handleSaveEditedArtifact}
            actions={readerActions}
            onClose={() => setShowReader(false)}
          />
        );
      })()}
    </>
  );
}
