import { useEffect, useRef, useState } from "react";
import type { SessionLogEvent, SessionLogEventType } from "../domain/sessionLog";

// ── Filter categories ─────────────────────────────────────────────────────────

type FilterTab = "all" | "commands" | "handoffs" | "errors" | "workspace";

const FILTER_TYPES: Record<FilterTab, SessionLogEventType[]> = {
  all:      [],
  commands: ["terminal_start", "terminal_restart", "terminal_kill", "terminal_exited", "terminal_error", "terminal_removed"],
  handoffs: ["manual_handoff", "auto_forward", "manual_send", "preset_brain_send"],
  errors:   ["terminal_error", "runtime_error"],
  workspace: ["workspace_saved", "workspace_loaded", "agent_created"],
};

// ── Event display helpers ─────────────────────────────────────────────────────

function badgeColor(type: SessionLogEventType): string {
  if (type === "terminal_error" || type === "runtime_error") return "#f87171";
  if (["terminal_start","terminal_restart","terminal_kill","terminal_exited","terminal_removed"].includes(type))
    return "#60a5fa";
  if (["manual_handoff","auto_forward","manual_send","preset_brain_send"].includes(type))
    return "#34d399";
  if (["workspace_saved","workspace_loaded","agent_created"].includes(type))
    return "#c084fc";
  return "#9ca3af";
}

function badgeLabel(type: SessionLogEventType): string {
  const map: Partial<Record<SessionLogEventType, string>> = {
    agent_created:    "ADDED",
    agent_updated:    "UPDATED",
    terminal_start:   "START",
    terminal_restart: "RESTART",
    terminal_kill:    "KILLED",
    terminal_exited:  "EXITED",
    terminal_error:   "ERROR",
    runtime_error:    "RUNTIME",
    terminal_removed: "REMOVED",
    manual_send:      "SEND",
    preset_brain_send:"BRAIN",
    manual_handoff:   "FORWARD",
    auto_forward:     "AUTO-FWD",
    workspace_saved:  "SAVED",
    workspace_loaded: "LOADED",
  };
  return map[type] ?? type.toUpperCase();
}

function eventMessage(ev: SessionLogEvent): string {
  switch (ev.type) {
    case "agent_created":    return `"${ev.agentLabel}" deployed`;
    case "terminal_start":   return "Terminal started";
    case "terminal_restart": return "Terminal restarted";
    case "terminal_kill":    return "Killed by user";
    case "terminal_exited":  return "Process exited";
    case "terminal_error":   return "Process error";
    case "runtime_error":
      return ev.payload.title
        ? String(ev.payload.title)
        : ev.payload.kind
        ? `Runtime error: ${String(ev.payload.kind).replace(/_/g, " ")}`
        : "Runtime error";
    case "terminal_removed": return "Terminal removed";
    case "manual_handoff":
      return ev.payload.targetLabel
        ? `Forwarded → ${String(ev.payload.targetLabel)}`
        : ev.payload.target
        ? `Forwarded → ${String(ev.payload.target)}`
        : "Output forwarded";
    case "auto_forward":
      return ev.payload.targetLabel
        ? `Auto-forwarded → ${String(ev.payload.targetLabel)}`
        : "Auto-forwarded to next agent";
    case "manual_send":      return "File content sent to terminal";
    case "preset_brain_send":return "Attachment sent to terminal";
    case "workspace_saved":
      return ev.payload.name ? `"${String(ev.payload.name)}" saved` : "Workspace saved";
    case "workspace_loaded":
      return ev.payload.name ? `"${String(ev.payload.name)}" loaded` : "Workspace loaded";
    default: return ev.type;
  }
}

function formatTime(ts: number): string {
  const d   = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  return (
    d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

function groupByDate(
  entries: SessionLogEvent[],
): Array<{ label: string; events: SessionLogEvent[] }> {
  const groups = new Map<string, SessionLogEvent[]>();
  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const ev of entries) {
    const ds    = new Date(ev.ts).toDateString();
    const label = ds === today ? "Today" : ds === yesterday ? "Yesterday" : new Date(ev.ts).toLocaleDateString();
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(ev);
  }
  return Array.from(groups.entries()).map(([label, events]) => ({ label, events }));
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  entries: SessionLogEvent[];
  onClear: () => void;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function HistoryDrawer({ entries, onClear, onClose }: Props) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  const filtered =
    filter === "all"
      ? entries
      : entries.filter((e) => FILTER_TYPES[filter].includes(e.type));

  const groups = groupByDate(filtered);

  function handleClear() {
    if (window.confirm("Clear all session history?")) onClear();
  }

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all",       label: "All" },
    { id: "commands",  label: "Terminals" },
    { id: "handoffs",  label: "Handoffs" },
    { id: "errors",    label: "Errors" },
    { id: "workspace", label: "Workspace" },
  ];

  return (
    <>
      {/* Overlay */}
      <div className="hist-overlay" onClick={onClose} />

      {/* Drawer */}
      <div className="hist-drawer">

        {/* Header */}
        <div className="hist-header">
          <span className="cmdino-panel-title">History</span>
          {entries.length > 0 && (
            <button
              className="cmdino-action-btn cmdino-action-btn--danger"
              style={{ fontSize: 10, padding: "3px 9px" }}
              onClick={handleClear}
              title="Clear history"
            >
              Clear
            </button>
          )}
          <button className="cmdino-close-btn" onClick={onClose} title="Close">✕</button>
        </div>

        {/* Filter tabs */}
        <div className="hist-filter-row">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`hist-filter-tab${filter === tab.id ? " hist-filter-tab--active" : ""}`}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Timeline body */}
        <div ref={bodyRef} className="hist-body">
          {filtered.length === 0 ? (
            <div className="hist-empty">
              <span className="hist-empty-icon">◎</span>
              <span className="hist-empty-msg">
                {entries.length === 0
                  ? "No events yet. Start a terminal or run a command."
                  : "No events match this filter."}
              </span>
            </div>
          ) : (
            groups.map(({ label, events }) => (
              <div key={label}>
                {/* Date separator */}
                <div className="hist-date-sep">
                  <span className="hist-date-label">{label}</span>
                  <div className="hist-date-line" />
                </div>

                {/* Events */}
                {events.map((ev) => {
                  const color = badgeColor(ev.type);
                  return (
                    <div key={ev.id} className="hist-event-row">
                      <div
                        className="hist-event-dot"
                        style={{ background: color }}
                      />
                      <div className="hist-event-content">
                        <div className="hist-event-top">
                          <span
                            className="hist-event-badge"
                            style={{
                              color,
                              background: `${color}18`,
                              border: `1px solid ${color}40`,
                            }}
                          >
                            {badgeLabel(ev.type)}
                          </span>
                          {ev.agentLabel && (
                            <span className="hist-event-agent">{ev.agentLabel}</span>
                          )}
                          <span className="hist-event-time">{formatTime(ev.ts)}</span>
                        </div>
                        <div className="hist-event-msg">{eventMessage(ev)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {entries.length > 0 && (
          <div className="hist-footer">
            {entries.length} event{entries.length !== 1 ? "s" : ""} recorded
          </div>
        )}
      </div>
    </>
  );
}
