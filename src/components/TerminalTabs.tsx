import type { TerminalAgent } from "../domain/terminalAgent";

const LIFECYCLE_COLORS: Record<string, string> = {
  dormant:  "#737373",
  spawning: "#fbbf24",
  running:  "#e5e5e5",
  exited:   "#6b7280",
  killed:   "#6b7280",
  error:    "#fca5a5",
};

interface Props {
  agents:             TerminalAgent[];
  activeTerminalId:   string | null;
  lifecycleByAgentId: Record<string, string>;
  onTabClick:         (id: string) => void;
}

export function TerminalTabs({
  agents, activeTerminalId, lifecycleByAgentId, onTabClick,
}: Props) {
  if (agents.length === 0) return null;

  return (
    <div
      style={{
        display:      "flex",
        alignItems:   "flex-end",
        gap:          2,
        padding:      "0 10px",
        background:   "var(--app-bg)",
        borderBottom: "1px solid var(--border-subtle)",
        flexShrink:   0,
        overflowX:    "auto",
        scrollbarWidth: "none",
        minHeight:    32,
      }}
    >
      {agents.map((agent) => {
        const lc      = lifecycleByAgentId[agent.id] ?? "dormant";
        const dotClr  = LIFECYCLE_COLORS[lc] ?? "#737373";
        const isActive = agent.id === activeTerminalId;

        return (
          <button
            key={agent.id}
            onClick={() => onTabClick(agent.id)}
            title={`${agent.label} · ${lc}`}
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          5,
              padding:      "5px 10px 6px",
              background:   isActive ? "var(--surface-1)" : "transparent",
              border:       "none",
              borderBottom: isActive
                ? "2px solid var(--accent)"
                : "2px solid transparent",
              borderRadius: "6px 6px 0 0",
              color:        isActive ? "var(--text-main)" : "var(--text-muted)",
              fontSize:     11,
              fontFamily:   "inherit",
              fontWeight:   isActive ? 650 : 500,
              cursor:       "pointer",
              flexShrink:   0,
              transition:   "background 0.1s, color 0.1s, border-color 0.1s",
              letterSpacing: 0,
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--button-bg)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-main)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
              }
            }}
          >
            <div
              style={{
                width:        6,
                height:       6,
                borderRadius: "50%",
                background:   dotClr,
                flexShrink:   0,
                transition:   "background 0.25s",
                boxShadow:    lc === "running" || lc === "spawning"
                  ? `0 0 0 2px ${dotClr}33` : "none",
              }}
            />
            <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {agent.label}
            </span>
            <span style={{ color: "var(--text-faint)", fontSize: 9, flexShrink: 0 }}>
              {lc}
            </span>
          </button>
        );
      })}
    </div>
  );
}
