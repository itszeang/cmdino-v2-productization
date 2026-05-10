import { useState } from "react";
import type { LastSessionRecord } from "../domain/lastSession";
import type { GeneratedOutputFile } from "../domain/attachments";

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000)           return "just now";
  if (diff < 3_600_000)        return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)       return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 86_400_000 * 30)  return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString();
}

interface Props {
  session:         LastSessionRecord;
  outputFiles:     GeneratedOutputFile[];
  onViewOutputs?:  () => void;
  onLoad:          () => Promise<void>;
  onDismiss:       () => void;
}

export function ContinuationPanel({ session, outputFiles, onViewOutputs, onLoad, onDismiss }: Props) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleLoad() {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await onLoad();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workspace file not found. It may have been moved or deleted.");
    } finally {
      setLoading(false);
    }
  }

  const agentLine = session.agentCount === 0
    ? "0 agents"
    : session.agentLabels.length > 0
    ? `${session.agentCount} agent${session.agentCount !== 1 ? "s" : ""}: ${session.agentLabels.join(", ")}`
    : `${session.agentCount} agent${session.agentCount !== 1 ? "s" : ""}`;

  const latestOutput = outputFiles[0];
  const showOutputs  = outputFiles.length > 0;

  return (
    <div style={{
      width: "100%", maxWidth: 420,
      background: "var(--surface-2, rgba(255,255,255,0.04))",
      border: "1px solid var(--border-subtle)",
      borderRadius: 10, padding: "14px 16px 12px",
      display: "flex", flexDirection: "column", gap: 8,
      position: "relative",
    }}>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        title="Dismiss"
        style={{
          position: "absolute", top: 8, right: 8,
          background: "transparent", border: "none",
          color: "var(--text-faint)", fontSize: 16, lineHeight: 1,
          cursor: "pointer", padding: "2px 5px",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-faint)"; }}
      >×</button>

      {/* Heading */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.7, color: "var(--text-faint)", textTransform: "uppercase" }}>
          Continue
        </span>
        <span style={{ fontSize: 12, fontWeight: 650, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {session.workspaceName}
        </span>
      </div>

      {/* Meta line */}
      <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
        <span style={{ color: "var(--text-faint)" }}>Saved {relativeTime(session.savedAt)}</span>
        {" · "}
        {agentLine}
      </div>

      {/* Outputs info — display only, no action button */}
      {showOutputs && (
        <div style={{ fontSize: 10, color: "var(--text-faint)" }}>
          {outputFiles.length} generated file{outputFiles.length !== 1 ? "s" : ""}
          {latestOutput ? ` · last: ${latestOutput.fileName} ${relativeTime(latestOutput.modifiedAt)}` : ""}
        </div>
      )}

      {/* Last activity */}
      {session.lastEventLabel && session.lastEventAt && (
        <div style={{ fontSize: 10, color: "var(--text-faint)" }}>
          Last activity: {session.lastEventLabel}{" "}
          <span style={{ color: "var(--text-faint)", opacity: 0.7 }}>{relativeTime(session.lastEventAt)}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ fontSize: 10, color: "var(--danger, #f87171)", lineHeight: 1.4 }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ marginTop: 2, display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          onClick={() => { void handleLoad(); }}
          disabled={loading}
          style={{
            background: loading ? "var(--button-bg)" : "var(--accent)",
            border: "1px solid transparent",
            color: loading ? "var(--text-muted)" : "var(--app-bg)",
            fontSize: 11, fontWeight: 650,
            padding: "7px 16px", borderRadius: 999,
            fontFamily: "inherit",
            cursor: loading ? "default" : "pointer",
            transition: "opacity 0.12s",
          }}
          onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
        >
          {loading ? "Loading…" : "Continue Work"}
        </button>
        {showOutputs && onViewOutputs && (
          <button
            onClick={onViewOutputs}
            style={{
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
              fontSize: 11, fontWeight: 600,
              padding: "7px 14px", borderRadius: 999,
              fontFamily: "inherit",
              cursor: "pointer",
              transition: "opacity 0.12s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.75"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          >
            Open Output Shelf
          </button>
        )}
      </div>

    </div>
  );
}
