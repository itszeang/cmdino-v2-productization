import { TerminalPane } from "./TerminalPane";
import { TerminalTabs } from "./TerminalTabs";
import type { TerminalAgent } from "../domain/terminalAgent";
import type { TerminalLifecycleState } from "../terminal/useTerminalProcess";
import type { WorkflowLink, WorkflowLinkKind } from "../domain/workflow";
import type { AppSettings } from "../domain/appSettings";
import type { TerminalViewMode } from "../domain/viewMode";
import type { ReadinessFailure } from "../domain/readiness";
import type { SessionLogEvent } from "../domain/sessionLog";
import type { CSSProperties } from "react";

// Minimum readable pane width used for browser-measured grid wrapping.
const GRID_PANE_MIN_WIDTH = 540;

interface Props {
  agents:               TerminalAgent[];
  onRemove:             (id: string) => void;
  runningAgentIds:      Set<string>;
  onStart:              (id: string) => void;
  onAddAttachment:      (agentId: string, path: string) => void;
  onRemoveAttachment:   (agentId: string, attachmentId: string) => void;
  onLifecycleChange:    (agentId: string, lifecycle: TerminalLifecycleState) => void;
  onRecordWorkflowLink: (sourceAgentId: string, targetAgentId: string, kind: WorkflowLinkKind) => void;
  onEditAgent:          (id: string) => void;
  readinessErrors:      Record<string, ReadinessFailure | null>;
  onReadinessError:     (agentId: string, failure: ReadinessFailure | null) => void;
  settings?:            AppSettings;
  viewMode:             TerminalViewMode;
  onViewModeChange:     (mode: TerminalViewMode) => void;
  activeTerminalId:     string | null;
  onActiveTerminalChange: (id: string) => void;
  lifecycleByAgentId:   Record<string, string>;
  onFocusPane:          (id: string) => void;
  workflowLinks:        WorkflowLink[];
  onFocusTarget:        (id: string) => void;
  onEvent?:             (event: SessionLogEvent) => void;
}

export function TerminalGrid({
  agents, onRemove, runningAgentIds, onStart,
  onAddAttachment, onRemoveAttachment,
  onLifecycleChange, onRecordWorkflowLink, onEditAgent,
  readinessErrors, onReadinessError,
  settings,
  viewMode, onViewModeChange, activeTerminalId, onActiveTerminalChange,
  lifecycleByAgentId, onFocusPane, workflowLinks, onFocusTarget,
  onEvent,
}: Props) {
  // Grid mode needs dynamic column/row counts — set as inline style only in grid mode.
  // Focus mode: no inline style on layout div (CSS class handles everything).
  // This keeps the JSX structure IDENTICAL between modes. Only the data-view attribute
  // on the root div changes, which CSS selectors use to apply layout differences.
  const layoutStyle = viewMode === "grid" ? {
    "--terminal-pane-min-width": `${GRID_PANE_MIN_WIDTH}px`,
  } as CSSProperties : undefined;

  return (
    <div className="terminal-grid" data-view={viewMode}>

      {/* Tabs row — always mounted in both modes */}
      <TerminalTabs
        agents={agents}
        activeTerminalId={activeTerminalId}
        lifecycleByAgentId={lifecycleByAgentId}
        onTabClick={(id) => {
          onActiveTerminalChange(id);
          if (viewMode === "grid") onViewModeChange("focus");
        }}
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
                  onEditAgent={onEditAgent}
                  readinessError={readinessErrors[agent.id] ?? null}
                  onReadinessError={onReadinessError}
                  settings={settings}
                  viewMode={viewMode}
                  isActive={isActive}
                  onFocus={() => onFocusPane(agent.id)}
                  workflowLinks={workflowLinks}
                  onFocusTarget={onFocusTarget}
                  onEvent={onEvent}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
