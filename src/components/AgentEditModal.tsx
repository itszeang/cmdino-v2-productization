import { useState } from "react";
import { DINO_OPTIONS } from "../config/dinoOptions";
import { getBrainById, buildBrainAttachments } from "../config/presetBrains";
import type { AgentKind } from "../domain/agentKind";
import type { TerminalAttachment } from "../domain/orchestration";
import { attachmentKindFromPath } from "../domain/orchestration";
import type { TerminalAgent } from "../domain/terminalAgent";
import type { AgentConfigUpdate } from "../state/useTerminalAgents";

const PRESET_PREFIX = "cmdino-preset://";

const KIND_BRAIN: Partial<Record<AgentKind, string>> = {
  claude: "claude-planner-brain",
  codex:  "codex-builder-brain",
  gemini: "gemini-reviewer-brain",
  ollama: "ollama-worker-brain",
};

interface Props {
  agent:     TerminalAgent;
  isRunning: boolean;
  onConfirm: (agentId: string, update: AgentConfigUpdate) => void;
  onCancel:  () => void;
}

export function AgentEditModal({ agent, isRunning, onConfirm, onCancel }: Props) {
  const [label,         setLabel]         = useState(agent.label);
  const [agentKind,     setAgentKind]     = useState<AgentKind>(agent.agentKind ?? "custom");
  const [launchCommand, setLaunchCommand] = useState(agent.launchCommand ?? "");
  const [cwd,           setCwd]           = useState(agent.cwd ?? "");
  const [dinoId,        setDinoId]        = useState(agent.dinoId);
  const [attachments,   setAttachments]   = useState<TerminalAttachment[]>(agent.attachments ?? []);
  const [addInput,      setAddInput]      = useState("");
  const [addError,      setAddError]      = useState("");

  const presetAtts = attachments.filter((a) => a.path.startsWith(PRESET_PREFIX));
  const normalAtts = attachments.filter((a) => !a.path.startsWith(PRESET_PREFIX));

  const recommendedBrainId = KIND_BRAIN[agentKind];
  const recommendedBrain   = recommendedBrainId ? getBrainById(recommendedBrainId) : undefined;
  const hasRecommended     = recommendedBrain
    ? attachments.some((a) => a.path === recommendedBrain.path)
    : false;

  const restartSensitiveChanged =
    isRunning && (
      (launchCommand.trim() || undefined) !== agent.launchCommand ||
      (cwd.trim() || undefined)           !== agent.cwd           ||
      agentKind !== (agent.agentKind ?? "custom")
    );

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function addRecommendedBrain() {
    if (!recommendedBrain) return;
    if (attachments.some((a) => a.path === recommendedBrain.path)) return;
    const [att] = buildBrainAttachments([recommendedBrain.id]);
    if (att) setAttachments((prev) => [...prev, att]);
  }

  function handleAddPath() {
    const p = addInput.trim();
    if (!p) return;
    if (!attachmentKindFromPath(p)) {
      setAddError("Only .md and .txt files allowed.");
      return;
    }
    if (attachments.some((a) => a.path === p)) {
      setAddError("Already attached.");
      return;
    }
    const att: TerminalAttachment = {
      id:       crypto.randomUUID(),
      path:     p,
      fileName: p.split(/[/\\]/).pop() ?? p,
      addedAt:  Date.now(),
      source:   "user",
    };
    setAttachments((prev) => [...prev, att]);
    setAddInput("");
    setAddError("");
  }

  function handleSubmit() {
    if (!label.trim()) return;
    onConfirm(agent.id, {
      label,
      dinoId,
      launchCommand: launchCommand.trim() || undefined,
      cwd:           cwd.trim()           || undefined,
      agentKind,
      attachments,
    });
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-box modal-box--agent"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "calc(100vh - 48px)", display: "flex", flexDirection: "column" }}
      >

        <div className="modal-header">
          <span className="modal-title">Agent Settings</span>
          <button className="modal-close-btn" onClick={onCancel}>×</button>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>

          {restartSensitiveChanged && (
            <div className="edit-running-notice">
              Command, working directory, and agent kind will apply on next restart. Current PTY stays untouched.
            </div>
          )}

          <div className="modal-field-group">
            <label className="modal-label">Label</label>
            <input
              className="modal-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus
            />
          </div>

          <div className="modal-field-group">
            <label className="modal-label">Agent Kind</label>
            <select
              className="modal-input modal-select"
              value={agentKind}
              onChange={(e) => setAgentKind(e.target.value as AgentKind)}
            >
              <option value="claude">Claude</option>
              <option value="codex">Codex</option>
              <option value="gemini">Gemini</option>
              <option value="ollama">Ollama</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="modal-field-group">
            <label className="modal-label">Launch Command</label>
            <input
              className="modal-input modal-input--mono"
              value={launchCommand}
              onChange={(e) => setLaunchCommand(e.target.value)}
              placeholder="e.g. claude  (blank = plain shell)"
            />
            <span className="modal-hint">
              {agentKind === "custom"
                ? "Any local command, shell script, or shell builtin."
                : "Command must be on your PATH. Install and authenticate the CLI before starting."}
            </span>
          </div>

          <div className="modal-field-group">
            <label className="modal-label">Working Directory</label>
            <input
              className="modal-input modal-input--mono"
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="Leave blank to inherit"
            />
          </div>

          <div className="modal-field-group">
            <label className="modal-label">Dino</label>
            <div className="dino-row">
              {DINO_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  className={`dino-btn${dinoId === opt.id ? " dino-btn--active" : ""}`}
                  onClick={() => setDinoId(opt.id)}
                  title={opt.label}
                >
                  <span className="dino-sprite" style={{ backgroundImage: `url("${opt.idlePath}")` }} />
                  <span className="dino-label">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preset Brain */}
          <div className="modal-field-group">
            <label className="modal-label">Preset Brain</label>
            {presetAtts.length === 0 && !recommendedBrain && (
              <span style={{ fontSize: 10, color: "var(--text-faint)" }}>
                No preset brain · no recommendation for {agentKind}.
              </span>
            )}
            {presetAtts.map((att) => (
              <div key={att.id} className="edit-att-row">
                <span className="chip-brain-badge">BRAIN</span>
                <span className="edit-att-name">{att.fileName}</span>
                <button
                  className="edit-att-remove"
                  onClick={() => removeAttachment(att.id)}
                  title="Remove brain"
                >×</button>
              </div>
            ))}
            {recommendedBrain && !hasRecommended && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
                <span style={{ fontSize: 10, color: "var(--text-muted)", flex: 1 }}>
                  Recommended:{" "}
                  <span style={{ fontFamily: "monospace", color: "var(--text-main)" }}>
                    {recommendedBrain.fileName}
                  </span>
                </span>
                <button
                  className="modal-btn modal-btn--cancel"
                  style={{ fontSize: 11, padding: "4px 12px" }}
                  onClick={addRecommendedBrain}
                >
                  + Add
                </button>
              </div>
            )}
            <span className="modal-hint">Preset brains are sent only when you press SEND</span>
          </div>

          {/* Normal Attachments */}
          <div className="modal-field-group" style={{ paddingBottom: 14 }}>
            <label className="modal-label">Attachments</label>
            {normalAtts.length === 0 && (
              <span style={{ fontSize: 10, color: "var(--text-faint)" }}>No user attachments.</span>
            )}
            {normalAtts.map((att) => (
              <div key={att.id} className="edit-att-row">
                <span className="edit-att-name">{att.fileName}</span>
                <button
                  className="edit-att-remove"
                  onClick={() => removeAttachment(att.id)}
                  title="Remove attachment"
                >×</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, alignItems: "center", paddingTop: 6 }}>
              <input
                className="modal-input modal-input--mono"
                style={{ flex: 1, fontSize: 11, padding: "6px 10px" }}
                value={addInput}
                onChange={(e) => { setAddInput(e.target.value); setAddError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddPath(); }}
                placeholder="Paste .md or .txt path…"
              />
              <button
                className="modal-btn modal-btn--cancel"
                style={{ fontSize: 11, padding: "6px 12px", flexShrink: 0 }}
                onClick={handleAddPath}
              >
                Add
              </button>
            </div>
            {addError && (
              <span style={{ fontSize: 10, color: "var(--danger)" }}>{addError}</span>
            )}
          </div>

        </div>

        <div className="modal-actions">
          <button className="modal-btn modal-btn--cancel" onClick={onCancel}>Cancel</button>
          <button
            className="modal-btn modal-btn--create"
            onClick={handleSubmit}
            disabled={!label.trim()}
          >
            Save Agent
          </button>
        </div>

      </div>
    </div>
  );
}
