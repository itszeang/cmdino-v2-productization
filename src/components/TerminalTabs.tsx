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
    <div className="terminal-tabs">
      {agents.map((agent) => {
        const lc      = lifecycleByAgentId[agent.id] ?? "dormant";
        const dotClr  = LIFECYCLE_COLORS[lc] ?? "#737373";
        const isActive = agent.id === activeTerminalId;
        const isLive  = lc === "running" || lc === "spawning";

        return (
          <button
            key={agent.id}
            className="terminal-tab"
            data-active={String(isActive)}
            onClick={() => onTabClick(agent.id)}
            title={`${agent.label} · ${lc}`}
          >
            <div
              className={`terminal-tab-status-dot${isLive ? " status-dot-pulse" : ""}`}
              style={{
                background: dotClr,
                boxShadow:  isLive ? `0 0 0 2px ${dotClr}33` : "none",
              }}
            />
            <span className="terminal-tab-label">{agent.label}</span>
            <span className="terminal-tab-meta">{lc}</span>
          </button>
        );
      })}
    </div>
  );
}
