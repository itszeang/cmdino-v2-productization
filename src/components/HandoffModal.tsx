import { useState } from "react";
import { terminalBridge } from "../terminal/terminalBridge";
import { extractReviewSendText } from "../domain/handoffProtocol";
import { getTerminalSubmitStrategy } from "../domain/workflowPromptSend";
import type { TerminalAgent } from "../domain/terminalAgent";

interface Props {
  sourceAgentId:  string;
  sourceLabel:    string;
  outputText:     string;
  selectedText?:  string;
  runningTargets: TerminalAgent[];
  preferredTargetId?: string;
  onClose:        () => void;
  onSent?:        (targetAgentId: string) => void;
}

export function HandoffModal({
  sourceAgentId,
  sourceLabel,
  outputText,
  selectedText = "",
  runningTargets,
  preferredTargetId,
  onClose,
  onSent,
}: Props) {
  const extracted = extractReviewSendText({ outputText, selectedText });
  const [targetId,  setTargetId]  = useState(
    preferredTargetId && runningTargets.some((t) => t.id === preferredTargetId)
      ? preferredTargetId
      : runningTargets[0]?.id ?? "",
  );
  const [text,      setText]      = useState(extracted.text);
  const [sending,   setSending]   = useState(false);
  const [sendError, setSendError] = useState("");

  async function handleSend() {
    if (!targetId || !text.trim()) return;
    setSending(true);
    setSendError("");
    try {
      const target = runningTargets.find((item) => item.id === targetId);
      await terminalBridge.submitLine(targetId, text, getTerminalSubmitStrategy(target?.agentKind));
      onSent?.(targetId);
      setSending(false);
      onClose();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : String(err));
      setSending(false);
    }
  }

  const noTargets  = runningTargets.length === 0;
  const canSend    = !noTargets && text.trim().length > 0 && !sending;

  const sourceHintClass = extracted.source === "none"
    ? "handoff-source-hint handoff-source-hint--warn"
    : "handoff-source-hint";

  return (
    <div
      className="cmdino-overlay"
      style={{ zIndex: 100 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="handoff-modal soft-enter" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="handoff-header">
          <span className="handoff-header-title">Review & Send</span>
          <span className="handoff-header-from">clean handoff from {sourceLabel}</span>
          <span className="handoff-header-id">({sourceAgentId.slice(0, 8)})</span>
          <button className="cmdino-close-btn" onClick={onClose} title="Close">✕</button>
        </div>

        {/* Target selection */}
        <div className="handoff-target-row">
          <span className="handoff-target-label">Target</span>
          {noTargets ? (
            <span className="handoff-target-error">No running terminals available as target.</span>
          ) : (
            <select
              className="handoff-target-select"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            >
              {runningTargets.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Handoff body */}
        <div className="handoff-body">
          <div className="handoff-body-label">
            <span className="handoff-body-label-main">Marked handoff text</span>
            <span className="handoff-body-label-hint">edit before sending</span>
          </div>
          <div className={sourceHintClass}>
            {extracted.source === "handoff_marker"
              ? "Extracted from CMDINO_HANDOFF markers. Terminal banners and unrelated output were ignored."
              : extracted.source === "cmdino_result"
              ? "Extracted from the CMDINO_RESULT handoff field."
              : extracted.source === "selected_text"
              ? "Using the text you selected in the terminal."
              : "No CMDINO_HANDOFF or CMDINO_RESULT handoff was found. Ask the agent for a marked handoff, or paste clean handoff text manually."}
          </div>
          <textarea
            className="handoff-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {sendError && <div className="handoff-send-error">{sendError}</div>}
        </div>

        {/* Footer */}
        <div className="handoff-footer">
          <button className="cmdino-action-btn cmdino-action-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="cmdino-action-btn cmdino-action-btn--primary"
            onClick={() => void handleSend()}
            disabled={!canSend}
          >
            {sending ? "Sending…" : "Send to Agent"}
          </button>
        </div>
      </div>
    </div>
  );
}
