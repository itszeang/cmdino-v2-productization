import { useEffect, useMemo, useState } from "react";
import type { TerminalAgent } from "../domain/terminalAgent";
import type { CmdinoContextManifest, ContextTarget } from "../domain/contextLibrary";
import {
  addContextManifestFile,
  buildContextRelativePath,
  createEmptyContextManifest,
  sanitizeContextManifest,
} from "../domain/contextLibrary";
import {
  readProjectContextFile,
  readProjectContextManifest,
  writeProjectContextFile,
  writeProjectContextManifest,
} from "../context/contextLibraryBridge";

const isTauri = Boolean(
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
);

interface Props {
  agent?: TerminalAgent;
  allAgents: TerminalAgent[];
  projectRoot?: string;
  runningAgentIds?: Set<string>;
  defaultSendTargetAgentId?: string;
  onClose: () => void;
  onSendTextOnce?: (agentId: string, content: string) => Promise<void>;
  onManifestChange?: (manifest: CmdinoContextManifest) => void;
}

export function ContextLibraryModal({
  agent,
  allAgents,
  projectRoot,
  runningAgentIds = new Set<string>(),
  defaultSendTargetAgentId,
  onClose,
  onSendTextOnce,
  onManifestChange,
}: Props) {
  const [manifest, setManifest] = useState<CmdinoContextManifest | null>(null);
  const [target, setTarget] = useState<ContextTarget>("global");
  const [targetAgentId, setTargetAgentId] = useState(agent?.id ?? allAgents[0]?.id ?? "");
  const [sendTargetAgentId, setSendTargetAgentId] = useState(
    defaultSendTargetAgentId && runningAgentIds.has(defaultSendTargetAgentId)
      ? defaultSendTargetAgentId
      : allAgents.find((item) => runningAgentIds.has(item.id))?.id ?? "",
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [copyState, setCopyState] = useState("");

  const selectedAgent = allAgents.find((item) => item.id === targetAgentId) ?? agent ?? allAgents[0] ?? null;
  const runningAgents = useMemo(
    () => allAgents.filter((item) => runningAgentIds.has(item.id)),
    [allAgents, runningAgentIds],
  );
  const selectedSendTarget = runningAgents.find((item) => item.id === sendTargetAgentId) ?? null;
  const canAttemptSave = Boolean(
    title.trim() &&
    content.trim() &&
    !saving &&
    (target === "global" || selectedAgent),
  );
  const sendOnceDisabledReason =
    !onSendTextOnce
      ? "Send Into Agent Once is unavailable here."
      : runningAgents.length === 0
      ? "Start at least one agent before using Send Into Agent Once."
      : !selectedSendTarget
      ? "Select a running target agent."
      : !content.trim()
      ? "Add content before sending."
      : "";
  const canSendOnce = !sendOnceDisabledReason && !sending;
  const canSendSavedOnce = Boolean(onSendTextOnce && selectedSendTarget && !sending);

  useEffect(() => {
    let cancelled = false;
    setNotice("");
    setWarning("");
    if (!projectRoot || !isTauri) {
      setManifest(createEmptyContextManifest(projectRoot ?? ""));
      return;
    }
    readProjectContextManifest(projectRoot)
      .then((result) => {
        if (cancelled) return;
        const clean = sanitizeContextManifest(result.manifest, projectRoot);
        setManifest(clean);
        onManifestChange?.(clean);
        if (result.warning) setWarning(result.warning);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setManifest(createEmptyContextManifest(projectRoot));
        setWarning(err instanceof Error ? err.message : String(err));
      });
    return () => { cancelled = true; };
  }, [onManifestChange, projectRoot]);

  useEffect(() => {
    if (sendTargetAgentId && runningAgentIds.has(sendTargetAgentId)) return;
    setSendTargetAgentId(runningAgents[0]?.id ?? "");
  }, [runningAgentIds, runningAgents, sendTargetAgentId]);

  const sortedFiles = useMemo(
    () => [...(manifest?.files ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [manifest],
  );

  async function handleSave() {
    if (!projectRoot) {
      setWarning("Open a local project folder before saving persistent context.");
      return;
    }
    if (!isTauri) {
      setWarning("Saving persistent context requires the desktop app.");
      return;
    }
    if (!title.trim() || !content.trim() || saving) return;
    setSaving(true);
    setNotice("");
    setWarning("");
    try {
      const currentManifest = manifest ?? createEmptyContextManifest(projectRoot);
      const relativePath = buildContextRelativePath({
        title,
        target,
        agentLabel: selectedAgent?.label,
        existingRelativePaths: currentManifest.files.map((file) => file.relativePath),
      });
      await writeProjectContextFile(projectRoot, relativePath, content);
      const nextManifest = addContextManifestFile(currentManifest, {
        title,
        target,
        agentId: target === "agent" ? selectedAgent?.id : undefined,
        agentLabel: target === "agent" ? selectedAgent?.label : undefined,
        relativePath,
      });
      const saved = await writeProjectContextManifest(projectRoot, nextManifest);
      const clean = sanitizeContextManifest(saved, projectRoot);
      setManifest(clean);
      onManifestChange?.(clean);
      setTitle("");
      setContent("");
      setNotice(`Saved ${relativePath}`);
    } catch (err) {
      setWarning(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSendOnce(text: string) {
    if (!text.trim() || sending) return;
    setSending(true);
    setNotice("");
    setWarning("");
    try {
      if (!onSendTextOnce || !selectedSendTarget) {
        setWarning(sendOnceDisabledReason || "Start an agent before using Send Into Agent Once.");
        return;
      }
      await onSendTextOnce(selectedSendTarget.id, text);
      setNotice(`Sent into ${selectedSendTarget.label} once. No project context file was created.`);
    } catch (err) {
      setWarning(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  async function handleSendSaved(relativePath: string) {
    if (!projectRoot) return;
    try {
      const fileContent = await readProjectContextFile(projectRoot, relativePath);
      await handleSendOnce(fileContent);
    } catch (err) {
      setWarning(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleCopyPath(path: string) {
    try {
      await navigator.clipboard.writeText(path);
      setCopyState(`Copied ${path}`);
    } catch {
      setCopyState("Copy failed");
    }
    setTimeout(() => setCopyState(""), 1800);
  }

  return (
    <div className="context-modal-overlay" onClick={onClose}>
      <div className="context-library-modal" onClick={(event) => event.stopPropagation()}>
        <div className="context-library-header">
          <div>
            <span className="context-library-kicker">Context Library</span>
            <h2>Context Library</h2>
            <p>
              Store project and agent context files locally. CMDino can reference these files in workflow prompts so agents remember project goals, rules, and role instructions.
            </p>
          </div>
          <button className="context-library-close" onClick={onClose} title="Close">×</button>
        </div>

        <div className="context-library-notice">
          Persistent context is stored in your project under <code>.cmdino/context</code>. Send Into Agent Once types this content into the selected terminal and does not save it as project context.
        </div>
        {!projectRoot && (
          <div className="context-library-warning">Open a local project folder before saving persistent context.</div>
        )}
        {warning && <div className="context-library-warning">{warning}</div>}
        {notice && <div className="context-library-success">{notice}</div>}
        {copyState && <div className="context-library-success">{copyState}</div>}

        <div className="context-library-body">
          <section className="context-library-form">
            <label>
              <span>Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Project Brief"
              />
            </label>
            <label>
              <span>Save target</span>
              <select value={target} onChange={(event) => setTarget(event.target.value as ContextTarget)}>
                <option value="global">Global Project Context</option>
                <option value="agent">Agent-specific Context</option>
              </select>
            </label>
            {target === "agent" && (
              <label>
                <span>Persistent context agent</span>
                {allAgents.length === 0 ? (
                  <div className="context-library-inline-warning">Create an agent before saving agent-specific context.</div>
                ) : (
                  <select value={targetAgentId} onChange={(event) => setTargetAgentId(event.target.value)}>
                    {allAgents.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                )}
              </label>
            )}
            <label className="context-library-editor">
              <span>Content markdown</span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="# Project Brief&#10;&#10;Write persistent context here..."
              />
            </label>
            <label>
              <span>Send Into Agent Once target</span>
              {runningAgents.length === 0 ? (
                <div className="context-library-inline-warning">Start at least one agent before using Send Into Agent Once.</div>
              ) : (
                <select value={sendTargetAgentId} onChange={(event) => setSendTargetAgentId(event.target.value)}>
                  {runningAgents.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              )}
            </label>
            {sendOnceDisabledReason && (
              <div className="context-library-inline-warning">{sendOnceDisabledReason}</div>
            )}
            <div className="context-library-actions">
              <button className="context-library-primary" disabled={!canAttemptSave} onClick={() => { void handleSave(); }}>
                {saving ? "Saving..." : "Save to Context Library"}
              </button>
              <button disabled={!canSendOnce || sending} onClick={() => { void handleSendOnce(content); }}>
                {sending ? "Sending..." : "Send Into Agent Once"}
              </button>
              <button onClick={onClose}>Cancel</button>
            </div>
          </section>

          <section className="context-library-list">
            <div className="context-library-list-header">
              <strong>Saved context</strong>
              <span>{sortedFiles.length} file{sortedFiles.length === 1 ? "" : "s"}</span>
            </div>
            {sortedFiles.length === 0 ? (
              <div className="context-library-empty">No persistent context files are saved for this project yet.</div>
            ) : (
              sortedFiles.map((file) => (
                <div className="context-library-row" key={file.id}>
                  <div>
                    <strong>{file.title}</strong>
                    <span>{file.target === "global" ? "Global" : `Agent: ${file.agentLabel ?? "Unknown"}`}</span>
                    <code>{file.relativePath}</code>
                    <span>Updated {new Date(file.updatedAt).toLocaleString()}</span>
                  </div>
                  <div className="context-library-row-actions">
                    <button onClick={() => { void handleCopyPath(file.relativePath); }}>Copy path</button>
                    <button disabled={!canSendSavedOnce} onClick={() => { void handleSendSaved(file.relativePath); }}>Send once</button>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
