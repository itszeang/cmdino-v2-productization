import { useState } from "react";
import type { AgentInteraction } from "../domain/agentInteraction";

interface Props {
  interaction:     AgentInteraction;
  onOpenTerminal?: () => void;
  onSendResponse:  (interactionId: string, agentId: string, text: string) => Promise<void>;
  onDismiss:       (interactionId: string) => void;
}

function typeLabel(type: AgentInteraction["interactionType"]): string {
  switch (type) {
    case "approval":           return "Permission Prompt";
    case "yes_no":             return "Confirmation";
    case "selection":          return "Selection";
    case "enter_to_continue":  return "Continue Prompt";
    case "free_text":          return "Input Required";
    default:                   return "Input Required";
  }
}

export function InteractionCard({ interaction, onOpenTerminal, onSendResponse, onDismiss }: Props) {
  const [customText,  setCustomText]  = useState("");
  const [showCustom,  setShowCustom]  = useState(false);
  const [sending,     setSending]     = useState(false);
  const [notice,      setNotice]      = useState("");

  const responded = interaction.status === "responded";
  const dismissed = interaction.status === "dismissed";

  if (dismissed) return null;

  async function handleSend(value: string) {
    if (sending) return;
    setSending(true);
    setNotice("");
    try {
      await onSendResponse(interaction.interactionId, interaction.agentId, value);
      setNotice("Sent ✓");
    } catch {
      setNotice("Failed to send — open the terminal to respond manually.");
    } finally {
      setSending(false);
    }
  }

  async function handleCustomSend() {
    const text = customText.trim();
    if (!text && interaction.interactionType !== "enter_to_continue") return;
    await handleSend(text);
    setCustomText("");
    setShowCustom(false);
  }

  return (
    <div
      className={`interaction-card${responded ? " interaction-card--responded" : ""}`}
      data-type={interaction.interactionType}
    >
      {/* Header */}
      <div className="interaction-card-header">
        <span className="interaction-card-pulse-dot" />
        <div className="interaction-card-title-group">
          <span className="interaction-card-title">
            {interaction.agentLabel} needs your input
          </span>
          <span className="interaction-card-type">{typeLabel(interaction.interactionType)}</span>
        </div>
        <button
          className="interaction-card-dismiss"
          onClick={() => onDismiss(interaction.interactionId)}
          title="Dismiss"
          aria-label="Dismiss interaction"
        >
          ×
        </button>
      </div>

      {/* Excerpt */}
      {interaction.promptExcerpt && (
        <pre className="interaction-card-excerpt">{interaction.promptExcerpt}</pre>
      )}

      {/* Actions or responded state */}
      {responded ? (
        <div className="interaction-card-responded">
          <span className="interaction-card-responded-text">
            Response sent to {interaction.agentLabel}
          </span>
          {notice && <span className="interaction-card-notice">{notice}</span>}
        </div>
      ) : (
        <div className="interaction-card-actions">
          {/* Suggested response buttons */}
          {interaction.suggestedActions.map((action) => (
            <button
              key={action.label}
              className="interaction-card-action-btn interaction-card-action-btn--primary"
              onClick={() => { void handleSend(action.value); }}
              disabled={sending}
              title={`Send "${action.value || "(Enter)"}" to ${interaction.agentLabel}`}
            >
              {sending ? "Sending…" : action.label}
            </button>
          ))}

          {/* Open terminal */}
          {onOpenTerminal && (
            <button
              className="interaction-card-action-btn interaction-card-action-btn--secondary"
              onClick={onOpenTerminal}
            >
              Open Terminal
            </button>
          )}

          {/* Custom response toggle */}
          <button
            className="interaction-card-action-btn interaction-card-action-btn--secondary"
            onClick={() => setShowCustom((v) => !v)}
          >
            {showCustom ? "Cancel" : "Custom Response"}
          </button>

          {/* Custom response input */}
          {showCustom && (
            <div className="interaction-card-custom">
              <input
                className="interaction-card-custom-input"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder={
                  interaction.interactionType === "enter_to_continue"
                    ? "(leave empty to send Enter)"
                    : "Type response…"
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleCustomSend();
                  }
                  if (e.key === "Escape") setShowCustom(false);
                }}
                autoFocus
              />
              <button
                className="interaction-card-custom-send"
                onClick={() => { void handleCustomSend(); }}
                disabled={
                  sending ||
                  (!customText.trim() && interaction.interactionType !== "enter_to_continue")
                }
              >
                {sending ? "Sending…" : `Send to ${interaction.agentLabel}`}
              </button>
            </div>
          )}

          {notice && <span className="interaction-card-notice">{notice}</span>}
        </div>
      )}
    </div>
  );
}
