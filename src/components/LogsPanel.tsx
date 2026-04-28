import { useCallback, useEffect, useRef, useState } from "react";
import type { TerminalLifecycleState } from "../terminal/useTerminalProcess";

const ANSI_RE =
  /\x1b(?:\[[0-9;]*[mGKHFJABCDsuhlc?]|\][^\x07]*\x07|[()][0-9A-Z])/g;

function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}

const LIFECYCLE_COLORS: Record<TerminalLifecycleState, string> = {
  dormant:  "#1e3a4a",
  spawning: "#facc15",
  running:  "#00c8ff",
  exited:   "#6b7280",
  killed:   "#6b7280",
  error:    "#f87171",
};

interface Props {
  label: string;
  lifecycle: TerminalLifecycleState;
  getLogs: () => string;
  onClose: () => void;
}

export function LogsPanel({ label, lifecycle, getLogs, onClose }: Props) {
  const [text, setText] = useState(() => stripAnsi(getLogs()));
  const endRef = useRef<HTMLDivElement>(null);

  // Poll for new output every 500ms while panel is open
  useEffect(() => {
    const id = setInterval(() => setText(stripAnsi(getLogs())), 500);
    return () => clearInterval(id);
  }, [getLogs]);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "auto" });
  }, [text]);

  // Escape key closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const copyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(stripAnsi(getLogs()));
    } catch { /* ignore */ }
  }, [getLogs]);

  return (
    <div className="logs-overlay" onClick={onClose}>
      <div className="logs-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="logs-header">
          <span className="logs-title">{label}</span>
          <span
            className="logs-lifecycle-badge"
            style={{ color: LIFECYCLE_COLORS[lifecycle] }}
          >
            {lifecycle.toUpperCase()}
          </span>
          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            <button className="logs-btn" onClick={copyAll}>
              COPY ALL
            </button>
            <button className="logs-btn logs-btn--close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="logs-body">
          {text.trim() ? (
            <pre className="logs-pre">{text}</pre>
          ) : (
            <div className="logs-empty">No output recorded yet.</div>
          )}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
}
