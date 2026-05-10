import { useState } from "react";
import { ContinuationPanel } from "./ContinuationPanel";
import type { LastSessionRecord } from "../domain/lastSession";
import type { GeneratedOutputFile } from "../domain/attachments";

interface Props {
  maxTerminals:         number;
  onDeployAgent:        () => void;
  onLoadDemo:           () => void;
  onLoadTemplate:       () => void;
  lastSession?:         LastSessionRecord | null;
  outputFiles?:         GeneratedOutputFile[];
  onViewOutputs?:       () => void;
  onLoadLastWorkspace?: () => Promise<void>;
}

export function EmptyWorkspaceState({
  onDeployAgent, onLoadDemo, onLoadTemplate,
  lastSession, outputFiles = [], onViewOutputs, onLoadLastWorkspace,
}: Props) {
  const [continuationDismissed, setContinuationDismissed] = useState(false);

  const showContinuation = !!lastSession && !continuationDismissed && !!onLoadLastWorkspace;

  return (
    <div className="empty-ws">
      <div className="empty-ws-inner">

        {/* Continuation panel — shown above existing actions for returning users */}
        {showContinuation && (
          <div style={{ marginBottom: 20, width: "100%", display: "flex", justifyContent: "center" }}>
            <ContinuationPanel
              session={lastSession!}
              outputFiles={outputFiles}
              onViewOutputs={onViewOutputs}
              onLoad={onLoadLastWorkspace!}
              onDismiss={() => setContinuationDismissed(true)}
            />
          </div>
        )}

        <span className="cmdino-product-mark empty-ws-icon" aria-hidden="true">
          &gt;_
        </span>

        <h1 className="empty-ws-headline">Start Your Agent Workspace</h1>

        <p className="empty-ws-desc">
          CMDino runs local CLI agents on your machine, then gives them a visual workspace for context,
          handoff, and review.
        </p>

        <p className="empty-ws-alpha">
          Alpha build - local-first, no cloud sync.
        </p>

        <div className="empty-ws-actions">
          <button className="empty-ws-primary" onClick={onDeployAgent}>
            Start With an Agent
          </button>

          <button className="empty-ws-secondary" onClick={onLoadTemplate}>
            Use a Template
          </button>

          <div className="empty-ws-demo-wrap">
            <button className="empty-ws-secondary" onClick={onLoadDemo}>
              Try Demo Setup
            </button>
            <span className="empty-ws-demo-hint">
              Instantly load a planner → builder → reviewer chain.
            </span>
          </div>
        </div>

        <div className="empty-ws-steps">
          <div className="empty-ws-step">
            <span className="empty-ws-step-num">1</span>
            <span className="empty-ws-step-label">Start agents</span>
          </div>
          <span className="empty-ws-step-sep">→</span>
          <div className="empty-ws-step">
            <span className="empty-ws-step-num">2</span>
            <span className="empty-ws-step-label">Add context</span>
          </div>
          <span className="empty-ws-step-sep">→</span>
          <div className="empty-ws-step">
            <span className="empty-ws-step-num">3</span>
            <span className="empty-ws-step-label">Send to agent</span>
          </div>
        </div>

      </div>
    </div>
  );
}
