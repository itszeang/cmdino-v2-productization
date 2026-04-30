interface Props {
  maxTerminals: number;
  onDeployAgent: () => void;
  onLoadDemo:    () => void;
}

export function EmptyWorkspaceState({ onDeployAgent, onLoadDemo }: Props) {
  return (
    <div className="empty-ws">
      <div className="empty-ws-inner">

        <img
          src="/app-icon.png"
          alt=""
          aria-hidden="true"
          className="empty-ws-icon"
        />

        <h1 className="empty-ws-headline">Build Your First Agent Workspace</h1>

        <p className="empty-ws-desc">
          CMDino is a visual command center for running and coordinating multiple AI CLI agents.
        </p>

        <div className="empty-ws-actions">
          <button className="empty-ws-primary" onClick={onDeployAgent}>
            Deploy First Agent
          </button>

          <div className="empty-ws-demo-wrap">
            <button className="empty-ws-secondary" onClick={onLoadDemo}>
              Load Demo Workflow
            </button>
            <span className="empty-ws-demo-hint">
              Instantly load a planner → builder → reviewer chain.
            </span>
          </div>
        </div>

        <div className="empty-ws-steps">
          <div className="empty-ws-step">
            <span className="empty-ws-step-num">1</span>
            <span className="empty-ws-step-label">Deploy agents</span>
          </div>
          <span className="empty-ws-step-sep">→</span>
          <div className="empty-ws-step">
            <span className="empty-ws-step-num">2</span>
            <span className="empty-ws-step-label">Attach context</span>
          </div>
          <span className="empty-ws-step-sep">→</span>
          <div className="empty-ws-step">
            <span className="empty-ws-step-num">3</span>
            <span className="empty-ws-step-label">Handoff work</span>
          </div>
        </div>

      </div>
    </div>
  );
}
