import { TerminalPane } from "./TerminalPane";
import type { TerminalAgent } from "../domain/terminalAgent";
import type { TerminalLifecycleState } from "../terminal/useTerminalProcess";
import type { WorkflowLinkKind } from "../domain/workflow";
import type { AppSettings } from "../domain/appSettings";

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
}

export function TerminalGrid({
  agents, onRemove, runningAgentIds, onStart,
  onAddAttachment, onRemoveAttachment,
  onLifecycleChange, onRecordWorkflowLink,
  settings,
}: Props) {
  const n    = agents.length;
  const cols = getCols(n);
  const rows = Math.ceil(n / cols);
  const needsScroll = rows >= 3;

  return (
    <div style={{ height: "100%", overflowY: "auto", boxSizing: "border-box", padding: 10 }}>
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows:    needsScroll ? `repeat(${rows}, 280px)` : `repeat(${rows}, 1fr)`,
          gap:                 10,
          height:              needsScroll ? "auto" : "calc(100% - 0px)",
          minHeight:           "100%",
        }}
      >
        {agents.map((agent) => (
          <TerminalPane
            key={agent.id}
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
          />
        ))}
      </div>
    </div>
  );
}
