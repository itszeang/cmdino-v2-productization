import { TerminalPane } from "./TerminalPane";
import { AgentDock } from "./AgentDock";
import type { TerminalAgent } from "../domain/terminalAgent";
import type { TerminalLifecycleState } from "../terminal/useTerminalProcess";
import type { WorkflowLink, WorkflowLinkKind } from "../domain/workflow";
import type { AppSettings } from "../domain/appSettings";
import type { TerminalViewMode } from "../domain/viewMode";
import type { ReadinessFailure } from "../domain/readiness";
import type { SessionLogEvent } from "../domain/sessionLog";
import type { HealthSnapshot } from "../domain/health";
import type { GeneratedOutputFile } from "../domain/attachments";
import type { CSSProperties } from "react";

// Minimum readable pane width used for browser-measured grid wrapping.
const GRID_PANE_MIN_WIDTH = 540;

interface Props {
  agents:               TerminalAgent[];
  onRemove:             (id: string) => void;
  runningAgentIds:      Set<string>;
  onStart:              (id: string) => void;
  onAddAttachment:      (agentId: string, path: string, source?: "user" | "preset" | "generated") => void;
  onRemoveAttachment:   (agentId: string, attachmentId: string) => void;
  onLifecycleChange:    (agentId: string, lifecycle: TerminalLifecycleState) => void;
  onRecordWorkflowLink: (sourceAgentId: string, targetAgentId: string, kind: WorkflowLinkKind) => void;
  onEditAgent:          (id: string) => void;
  readinessErrors:      Record<string, ReadinessFailure | null>;
  onReadinessError:     (agentId: string, failure: ReadinessFailure | null) => void;
  settings?:            AppSettings;
  viewMode:             TerminalViewMode;
  activeTerminalId:     string | null;
  lifecycleByAgentId:   Record<string, string>;
  onFocusPane:                  (id: string) => void;
  workflowLinks:                WorkflowLink[];
  onFocusTarget:                (id: string) => void;
  onEvent?:                     (event: SessionLogEvent) => void;
  sessionEntries:               SessionLogEvent[];
  healthSnapshot:               HealthSnapshot;
  onDockSelectAgent:            (id: string) => void;
  onRegisterTranscriptGetter?:  (agentId: string, getter: (() => string) | null) => void;
  generatedOutputFiles?:        GeneratedOutputFile[];
  onRefreshGeneratedOutputs?:   () => void;
  onRegisterPaneRef?:           (agentId: string, el: HTMLElement | null) => void;
  onOpenHealth?:                () => void;
}

export function TerminalGrid({
  agents, onRemove, runningAgentIds, onStart,
  onAddAttachment, onRemoveAttachment,
  onLifecycleChange, onRecordWorkflowLink, onEditAgent,
  readinessErrors, onReadinessError,
  settings,
  viewMode, activeTerminalId,
  lifecycleByAgentId, onFocusPane, workflowLinks, onFocusTarget,
  onEvent, sessionEntries, healthSnapshot, onDockSelectAgent,
  onRegisterTranscriptGetter,
  generatedOutputFiles = [],
  onRefreshGeneratedOutputs,
  onRegisterPaneRef,
  onOpenHealth,
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

      {/* Agent Dock — replaces old TerminalTabs, always mounted in both modes */}
      <AgentDock
        agents={agents}
        activeTerminalId={activeTerminalId}
        lifecycleByAgentId={lifecycleByAgentId}
        sessionEntries={sessionEntries}
        healthSnapshot={healthSnapshot}
        readinessErrors={readinessErrors}
        animationSpeed={settings?.animationSpeed}
        onSelectAgent={onDockSelectAgent}
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
                  onAddAttachment={(path, source) => onAddAttachment(agent.id, path, source)}
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
                  onRegisterTranscriptGetter={onRegisterTranscriptGetter}
                  generatedOutputFiles={generatedOutputFiles}
                  onRefreshGeneratedOutputs={onRefreshGeneratedOutputs}
                  onRegisterPaneRef={onRegisterPaneRef}
                  onOpenHealth={onOpenHealth}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
