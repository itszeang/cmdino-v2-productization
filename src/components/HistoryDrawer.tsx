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
  const [filter,   setFilter]   = useState<FilterTab>("all");
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Auto-scroll to bottom when new entries arrive
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
    { id: "all",      label: "All" },
    { id: "commands", label: "Terminals" },
    { id: "handoffs", label: "Handoffs" },
    { id: "errors",   label: "Errors" },
    { id: "workspace",label: "Workspace" },
  ];

  return (
    <>
      {/* Overlay — click to close */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.35)",
          zIndex: 200,
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 400,
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
            History
          </span>
          {entries.length > 0 && (
            <button
              className="cmd-pill-btn cmd-pill-btn--danger"
              style={{ fontSize: 11, padding: "3px 9px" }}
              onClick={handleClear}
              title="Clear history"
            >
              Clear
            </button>
          )}
          <button
            className="cmd-icon-btn"
            onClick={onClose}
            title="Close"
          >×</button>
        </div>

        {/* Filter tabs */}
        <div style={{
          display: "flex", gap: 4, padding: "10px 14px 8px",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0, overflowX: "auto",
        }}>
          {tabs.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                style={{
                  background: active ? "var(--button-bg)" : "transparent",
                  border: `1px solid ${active ? "var(--border-strong)" : "transparent"}`,
                  color: active ? "var(--text-main)" : "var(--text-faint)",
                  fontSize: 11, fontWeight: active ? 600 : 400,
                  padding: "4px 10px", borderRadius: 999,
                  cursor: "pointer", whiteSpace: "nowrap",
                  fontFamily: "inherit", transition: "all 0.12s",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.color = "var(--text-faint)";
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Timeline body */}
        <div
          ref={bodyRef}
          style={{
            flex: 1, overflowY: "auto",
            padding: "8px 0 16px",
          }}
        >
          {filtered.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", gap: 8,
              color: "var(--text-faint)", padding: "32px 24px", textAlign: "center",
            }}>
              <span style={{ fontSize: 28, lineHeight: 1 }}>◎</span>
              <span style={{ fontSize: 12 }}>
                {entries.length === 0
                  ? "No events yet. Start a terminal or run a command."
                  : "No events match this filter."}
              </span>
            </div>
          ) : (
            groups.map(({ label, events }) => (
              <div key={label}>
                {/* Date separator */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 16px 4px",
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
                    color: "var(--text-faint)", textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}>
                    {label}
                  </span>
                  <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
                </div>

                {/* Events */}
                {events.map((ev) => {
                  const color = badgeColor(ev.type);
                  return (
                    <div
                      key={ev.id}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 10,
                        padding: "7px 16px",
                        borderLeft: `2px solid transparent`,
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = "var(--surface-2, rgba(255,255,255,0.03))";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = "transparent";
                      }}
                    >
                      {/* Color dot */}
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: color, flexShrink: 0, marginTop: 5,
                      }} />

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: "flex", alignItems: "center", gap: 6,
                          marginBottom: 2, flexWrap: "wrap",
                        }}>
                          {/* Badge */}
                          <span style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: 0.6,
                            color, background: `${color}18`,
                            border: `1px solid ${color}40`,
                            padding: "1px 6px", borderRadius: 999,
                            whiteSpace: "nowrap",
                          }}>
                            {badgeLabel(ev.type)}
                          </span>

                          {/* Agent label */}
                          {ev.agentLabel && (
                            <span style={{
                              fontSize: 11, color: "var(--text-muted)",
                              fontWeight: 500,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              maxWidth: 160,
                            }}>
                              {ev.agentLabel}
                            </span>
                          )}

                          {/* Timestamp */}
                          <span style={{
                            fontSize: 10, color: "var(--text-faint)",
                            marginLeft: "auto", whiteSpace: "nowrap", flexShrink: 0,
                          }}>
                            {formatTime(ev.ts)}
                          </span>
                        </div>

                        {/* Message */}
                        <div style={{
                          fontSize: 12, color: "var(--text-muted)",
                          lineHeight: 1.4,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {eventMessage(ev)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer count */}
        {entries.length > 0 && (
          <div style={{
            padding: "8px 16px",
            borderTop: "1px solid var(--border-subtle)",
            fontSize: 10, color: "var(--text-faint)",
            flexShrink: 0,
          }}>
            {entries.length} event{entries.length !== 1 ? "s" : ""} recorded
          </div>
        )}
      </div>
    </>
  );
}
