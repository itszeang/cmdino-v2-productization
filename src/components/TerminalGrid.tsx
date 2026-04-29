import { TerminalPane } from "./TerminalPane";
import { TerminalTabs } from "./TerminalTabs";
import type { TerminalAgent } from "../domain/terminalAgent";
import type { TerminalLifecycleState } from "../terminal/useTerminalProcess";
import type { WorkflowLinkKind } from "../domain/workflow";
import type { AppSettings } from "../domain/appSettings";
import type { TerminalViewMode } from "../domain/viewMode";

function getCols(n: number): number {
  if (n === 1) return 1;
  if (n <= 2) return 2;
  if (n <= 3) return 3;
  if (n <= 4) return 2;
  if (n <= 9) return 3;
  return 4;
}

interface Props {
  agents:               TerminalAgent[];
  onRemove:             (id: string) => void;
  runningAgentIds:      Set<string>;
  onStart:              (id: string) => void;
  onAddAttachment:      (agentId: string, path: string) => void;
  onRemoveAttachment:   (agentId: string, attachmentId: string) => void;
  onLifecycleChange:    (agentId: string, lifecycle: TerminalLifecycleState) => void;
  onRecordWorkflowLink: (sourceAgentId: string, targetAgentId: string, kind: WorkflowLinkKind) => void;
  settings?:            AppSettings;
  viewMode:             TerminalViewMode;
  activeTerminalId:     string | null;
  onActiveTerminalChange: (id: string) => void;
  lifecycleByAgentId:   Record<string, string>;
}

export function TerminalGrid({
  agents, onRemove, runningAgentIds, onStart,
  onAddAttachment, onRemoveAttachment,
  onLifecycleChange, onRecordWorkflowLink,
  settings,
  viewMode, activeTerminalId, onActiveTerminalChange,
  lifecycleByAgentId,
}: Props) {
  const n    = agents.length;
  const cols = getCols(n);
  const rows = Math.ceil(n / cols);
  const needsScroll = rows >= 3;

  // Grid mode needs dynamic column/row counts — set as inline style only in grid mode.
  // Focus mode: no inline style on layout div (CSS class handles everything).
  // This keeps the JSX structure IDENTICAL between modes. Only the data-view attribute
  // on the root div changes, which CSS selectors use to apply layout differences.
  const layoutStyle = viewMode === "grid" ? {
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows:    needsScroll ? `repeat(${rows}, 280px)` : `repeat(${rows}, 1fr)`,
    height:              needsScroll ? "auto" : "100%",
  } : undefined;

  return (
    <div className="terminal-grid" data-view={viewMode}>

      {/* Tabs row — always mounted in both modes */}
      <TerminalTabs
        agents={agents}
        activeTerminalId={activeTerminalId}
        lifecycleByAgentId={lifecycleByAgentId}
        onTabClick={onActiveTerminalChange}
      />

      {/*
       * Content: single stable agents.map regardless of viewMode.
       *
       * CRITICAL — do NOT branch here:
       *   {viewMode === "focus" ? <focusTree> : <gridTree>}
       *
       * Any structural divergence causes React to unmount TerminalPane on
       * viewMode change, which fires the useTerminalProcess spawn effect again
       * and produces "PTY error: terminal already running".
       *
       * Instead: CSS classes controlled by data-view handle all layout
       * differences. The JSX tree is always:
       *   div.terminal-content > div.terminal-layout > div[key].terminal-slot > TerminalPane
       */}
      <div className="terminal-content">
        <div className="terminal-layout" style={layoutStyle}>
          {agents.map((agent) => {
            const isActive = agent.id === activeTerminalId;
            return (
              <div
                key={agent.id}
                className="terminal-slot"
                data-active={String(isActive)}
              >
                <TerminalPane
                  agent={agent}
                  onRemove={onRemove}
                  isRunning={runningAgentIds.has(agent.id)}
                  onStart={() => onStart(agent.id)}
                  allAgents={agents}
                  runningAgentIds={runningAgentIds}
                  onAddAttachment={(path) => onAddAttachment(agent.id, path)}
                  onRemoveAttachment={(attId) => onRemoveAttachment(agent.id, attId)}
                  onLifecycleChange={onLifecycleChange}
                  onRecordWorkflowLink={onRecordWorkflowLink}
                  settings={settings}
                  viewMode={viewMode}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
