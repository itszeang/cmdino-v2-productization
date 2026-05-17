import { useEffect, useRef, useState } from "react";
import type { CmdinoChatMessage, InterventionRequiredChatMessage } from "../domain/cmdinoChat";
import type { Intervention, InterventionActionKind } from "../domain/intervention";
import { buildWorkflowRecoveryPrompt, type WorkflowPromptAgentTarget } from "../domain/workflowPromptSend";
import { extractStructuredWorkflowOutput } from "../domain/workflowResultCapture";
import type { AgentTeam } from "../domain/agentTeam";
import type { WorkflowRun } from "../domain/workflowRun";
import {
  completedStepSummaries,
  nextStepAfterCurrent,
  workflowStepHandoff,
} from "../domain/workflowSummary";
import { buildBuildInPublicDraft, buildWorkflowStepArtifactsMarkdown } from "../domain/workflowArtifacts";
import type { CmdinoResultParseResult } from "../orchestration/cmdinoResultParser";
import type { BuiltStepPrompt } from "../orchestration/stepPromptBuilder";
import { AgentTeamSelector } from "./AgentTeamSelector";
import { WorkflowRunTimeline, type WorkflowTimelineBinding } from "./WorkflowRunTimeline";
import { getAgentCwdHealth } from "../domain/agentCwd";

interface MainTaskChatProps {
  projectName?: string;
  projectPath?: string;
  agentTeamName?: string;
  agentTeams?: AgentTeam[];
  selectedAgentTeamId?: string | null;
  onSelectAgentTeam?: (teamId: string | null) => void;
  messages: CmdinoChatMessage[];
  interventions?: Intervention[];
  openInterventions?: Intervention[];
  currentRun?: WorkflowRun | null;
  currentStepPrompt?: BuiltStepPrompt | null;
  workflowAgentTargets?: WorkflowPromptAgentTarget[];
  onSubmitTask: (text: string) => void;
  selectedTeamDeployed?: boolean;
  onDeploySelectedTeam?: () => void;
  onSendWorkflowPromptToAgent?: (input: {
    agentId: string;
    prompt: string;
  }) => Promise<{ ok: boolean; message: string }>;
  onCaptureWorkflowResultFromAgent?: (input: {
    agentId: string;
  }) => {
    ok: true;
    text: string;
    message: string;
    source: "selected_text" | "latest_output";
    agentLabel: string;
  } | { ok: false; message: string };
  onSendWorkflowResultCorrectionToAgent?: (input: {
    agentId: string;
  }) => Promise<{ ok: boolean; message: string }>;
  onSaveWorkflowFinalOutput?: () => Promise<{ ok: boolean; message: string }>;
  onSaveWorkflowStepArtifacts?: () => Promise<{ ok: boolean; message: string }>;
  onSaveWorkflowBuildPublicDraft?: () => Promise<{ ok: boolean; message: string }>;
  onParseResult?: (text: string) => CmdinoResultParseResult;
  onContinueWorkflow?: () => void;
  onCancelWorkflow?: () => void;
  onClear?: () => void;
  onOpenAgents?: () => void;
  onOpenProject?: () => void;
  onOpenContextLibrary?: () => void;
  onOpenSetupCheck?: () => void;
  onInterventionAction?: (intervention: Intervention, actionKind: InterventionActionKind) => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function parseFailureTitle(result: CmdinoResultParseResult): string {
  if (result.ok) return "";
  if (result.reason === "missing_block") return "Missing CMDINO_RESULT block";
  if (result.reason === "invalid_json") return "Result block JSON is invalid";
  return "Result block shape is invalid";
}

function parseFailureDetail(result: CmdinoResultParseResult): string {
  if (result.ok) return "";
  if (result.reason === "missing_block") {
    return "Ask the agent to finish with CMDINO_RESULT and CMDINO_HANDOFF, then capture or paste again.";
  }
  if (result.reason === "invalid_json") {
    return "CMDino found the block, but JSON parsing failed. Ask the agent to resend valid JSON inside the block.";
  }
  return "Required fields: status, summary, handoff, and needs_user_action.";
}

function InterventionChatCard({
  message,
  intervention,
  onOpenAgents,
  onOpenSetupCheck,
  onInterventionAction,
}: {
  message: InterventionRequiredChatMessage;
  intervention?: Intervention;
  onOpenAgents?: () => void;
  onOpenSetupCheck?: () => void;
  onInterventionAction?: (intervention: Intervention, actionKind: InterventionActionKind) => void;
}) {
  const actions = intervention?.actions ?? [];
  return (
    <div className="chat-intervention-card">
      <div className="chat-card-title">{intervention?.title ?? message.title}</div>
      <div className="chat-card-copy">{intervention?.message ?? message.message}</div>
      {intervention && (
        <div className="chat-intervention-meta">
          {intervention.kind.replace(/_/g, " ")} · {intervention.status}
        </div>
      )}
      <div className="chat-intervention-actions">
        {intervention && onInterventionAction ? (
          actions.map((action) => (
            <button
              key={action.id}
              className="chat-mini-btn"
              onClick={() => onInterventionAction(intervention, action.kind)}
              disabled={intervention.status === "resolved" || intervention.status === "dismissed"}
            >
              {action.label}
            </button>
          ))
        ) : (
          <>
            <button className="chat-mini-btn" onClick={onOpenAgents} disabled={!onOpenAgents}>
              Open Agents
            </button>
            <button className="chat-mini-btn" onClick={onOpenSetupCheck} disabled={!onOpenSetupCheck}>
              Open Setup Check
            </button>
            <button className="chat-mini-btn" disabled title="No intervention state is linked to this card">
              Mark Resolved
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ChatMessageCard({
  message,
  onOpenAgents,
  onOpenSetupCheck,
  interventions,
  onInterventionAction,
}: {
  message: CmdinoChatMessage;
  onOpenAgents?: () => void;
  onOpenSetupCheck?: () => void;
  interventions?: Intervention[];
  onInterventionAction?: (intervention: Intervention, actionKind: InterventionActionKind) => void;
}) {
  if (message.kind === "intervention_required") {
    const intervention = interventions?.find((item) => item.id === message.interventionId);
    return (
      <div className="chat-message chat-message--intervention">
        <InterventionChatCard
          message={message}
          intervention={intervention}
          onOpenAgents={onOpenAgents}
          onOpenSetupCheck={onOpenSetupCheck}
          onInterventionAction={onInterventionAction}
        />
        <span className="chat-message-time">{formatTime(message.createdAt)}</span>
      </div>
    );
  }

  if (message.kind === "user_task") {
    return (
      <div className="chat-message chat-message--user">
        <div className="chat-message-label">You</div>
        <div className="chat-message-body">{message.text}</div>
        <span className="chat-message-time">{formatTime(message.createdAt)}</span>
      </div>
    );
  }

  if (message.kind === "workflow_progress") {
    return (
      <div className="chat-message chat-message--progress">
        <div className="chat-message-label">Workflow</div>
        <div className="chat-message-body">
          <strong>{message.title}</strong>
          {message.detail && <span>{message.detail}</span>}
        </div>
        <span className="chat-message-time">{formatTime(message.createdAt)}</span>
      </div>
    );
  }

  if (message.kind === "final_output") {
    return (
      <div className="chat-message chat-message--final">
        <div className="chat-message-label">Final Output</div>
        <pre className="chat-final-output">{message.markdown}</pre>
        <span className="chat-message-time">{formatTime(message.createdAt)}</span>
      </div>
    );
  }

  if (message.kind === "agent_started" || message.kind === "agent_completed") {
    return (
      <div className="chat-message chat-message--status">
        <div className="chat-message-label">{message.agentName}</div>
        <div className="chat-message-body">
          {message.kind === "agent_started" ? "Started" : "Completed"}
          {"detail" in message && message.detail && <span>{message.detail}</span>}
          {"summary" in message && message.summary && <span>{message.summary}</span>}
        </div>
        <span className="chat-message-time">{formatTime(message.createdAt)}</span>
      </div>
    );
  }

  return (
    <div className="chat-message chat-message--status">
      <div className="chat-message-label">CMDino</div>
      <div className="chat-message-body">{message.text}</div>
      <span className="chat-message-time">{formatTime(message.createdAt)}</span>
    </div>
  );
}

export function MainTaskChat({
  projectName,
  projectPath,
  agentTeamName = "Vibe App Builder",
  agentTeams = [],
  selectedAgentTeamId,
  onSelectAgentTeam,
  messages,
  interventions = [],
  openInterventions = [],
  currentRun,
  currentStepPrompt,
  workflowAgentTargets = [],
  onSubmitTask,
  selectedTeamDeployed = false,
  onDeploySelectedTeam,
  onSendWorkflowPromptToAgent,
  onCaptureWorkflowResultFromAgent,
  onSaveWorkflowFinalOutput,
  onSaveWorkflowStepArtifacts,
  onSaveWorkflowBuildPublicDraft,
  onParseResult,
  onSendWorkflowResultCorrectionToAgent,
  onContinueWorkflow,
  onCancelWorkflow,
  onClear,
  onOpenAgents,
  onOpenProject,
  onOpenContextLibrary,
  onOpenSetupCheck,
  onInterventionAction,
}: MainTaskChatProps) {
  const [taskText, setTaskText] = useState("");
  const [resultText, setResultText] = useState("");
  const [parseResult, setParseResult] = useState<CmdinoResultParseResult | null>(null);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");
  const [selectedTargetAgentId, setSelectedTargetAgentId] = useState("");
  const [sendNotice, setSendNotice] = useState("");
  const [sendingPrompt, setSendingPrompt] = useState(false);
  const [captureNotice, setCaptureNotice] = useState("");
  const [captureMeta, setCaptureMeta] = useState("");
  const [correctionNotice, setCorrectionNotice] = useState("");
  const [sendingCorrection, setSendingCorrection] = useState(false);
  const [artifactNotice, setArtifactNotice] = useState("");
  const [savingArtifact, setSavingArtifact] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [showAgentDetails, setShowAgentDetails] = useState(false);
  const resultTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const currentStep = currentRun?.currentStepId
    ? currentRun.steps.find((step) => step.id === currentRun.currentStepId) ?? null
    : null;
  const currentStepIndex = currentRun && currentStep
    ? currentRun.steps.findIndex((step) => step.id === currentStep.id)
    : -1;
  const canContinue = currentStep?.status === "completed";
  const previousSteps = currentRun
    ? completedStepSummaries({
        ...currentRun,
        steps: currentStepIndex >= 0 ? currentRun.steps.slice(0, currentStepIndex) : currentRun.steps,
      })
    : [];
  const nextStep = currentRun ? nextStepAfterCurrent(currentRun) : null;
  const currentHandoff = workflowStepHandoff(currentStep);
  const promptCannotBeSent = currentStep?.status !== "waiting_for_approval";
  const selectedTarget = workflowAgentTargets.find((agent) => agent.id === selectedTargetAgentId) ?? null;
  const selectedTargetCwdHealth = selectedTarget
    ? getAgentCwdHealth({ agentCwd: selectedTarget.cwd, selectedProjectRoot: projectPath })
    : null;
  const sentTarget = currentStep?.agentId
    ? workflowAgentTargets.find((agent) => agent.id === currentStep.agentId) ?? null
    : null;
  const selectedTargetIsSuggested = Boolean(selectedTarget?.isSuggested && !currentStep?.agentId);
  const workflowStepBindings: WorkflowTimelineBinding[] = currentRun
    ? currentRun.steps.map((step) => {
        const boundTarget = step.agentId
          ? workflowAgentTargets.find((agent) => agent.id === step.agentId) ?? null
          : null;
        if (boundTarget) {
          const cwdHealth = getAgentCwdHealth({
            agentCwd: boundTarget.cwd,
            selectedProjectRoot: projectPath,
          });
          return {
            stepId: step.id,
            status: !boundTarget.isRunning
              ? "stopped"
              : cwdHealth.status === "different"
                ? "cwd_mismatch"
                : "bound",
            agentLabel: boundTarget.label,
            detail: !boundTarget.isRunning
              ? "This step was sent to an agent that is no longer running."
              : cwdHealth.warning,
          };
        }
        if (step.id === currentStep?.id && selectedTarget) {
          const cwdHealth = getAgentCwdHealth({
            agentCwd: selectedTarget.cwd,
            selectedProjectRoot: projectPath,
          });
          return {
            stepId: step.id,
            status: !selectedTarget.isRunning
              ? "stopped"
              : cwdHealth.status === "different"
                ? "cwd_mismatch"
                : "suggested",
            agentLabel: selectedTarget.label,
            detail: selectedTarget.isRunning
              ? cwdHealth.warning ?? "Selected for this send, but not bound until you click Send Prompt to Agent."
              : "Selected target is not running.",
          };
        }
        return {
          stepId: step.id,
          status: "unbound",
          detail: "Select a running agent when this checkpoint is ready.",
        };
      })
    : [];
  const canSendPrompt = Boolean(
    currentStepPrompt &&
    selectedTarget &&
    selectedTarget.isRunning &&
    selectedTeamDeployed &&
    !promptCannotBeSent &&
    onSendWorkflowPromptToAgent &&
    !sendingPrompt,
  );
  const canCaptureResult = Boolean(
    currentStep?.agentId &&
    sentTarget?.isRunning &&
    onCaptureWorkflowResultFromAgent,
  );
  const selectedTeam = selectedAgentTeamId
    ? agentTeams.find((team) => team.id === selectedAgentTeamId) ?? null
    : null;
  const activeTeam = currentRun?.agentTeamId
    ? agentTeams.find((team) => team.id === currentRun.agentTeamId) ?? selectedTeam
    : selectedTeam;
  const teamStepLabels = activeTeam?.steps.map((step) => step.label).join(" -> ");
  const teamLocked = Boolean(currentRun && currentRun.status !== "completed" && currentRun.status !== "cancelled");
  const runningAgentCount = workflowAgentTargets.filter((a) => a.isRunning).length;
  const totalAgentCount = workflowAgentTargets.length;
  const noRunningAgents = runningAgentCount === 0;
  const projectRequired = !projectPath;
  const teamRequired = !selectedAgentTeamId;
  useEffect(() => {
    setSelectedTargetAgentId("");
    setSendNotice("");
    setCaptureNotice("");
    setCaptureMeta("");
    setCorrectionNotice("");
    setArtifactNotice("");
    setCopyStatus("");
    setParseResult(null);
  }, [currentRun?.id, currentRun?.currentStepId]);

  useEffect(() => {
    if (!selectedTargetAgentId && currentStep?.agentId) {
      setSelectedTargetAgentId(currentStep.agentId);
    }
  }, [currentStep?.agentId, selectedTargetAgentId]);

  useEffect(() => {
    if (selectedTargetAgentId || !currentStep || currentStep.agentId) return;
    const suggested = workflowAgentTargets.find((agent) => agent.isSuggested);
    if (suggested) setSelectedTargetAgentId(suggested.id);
  }, [currentStep, currentStep?.agentId, selectedTargetAgentId, workflowAgentTargets]);

  function submit() {
    if (projectRequired) return;
    if (teamRequired) return;
    const trimmed = taskText.trim();
    if (!trimmed) return;
    onSubmitTask(trimmed);
    setTaskText("");
  }

  async function copyPrompt() {
    if (!currentStepPrompt) return;
    await copyText(currentStepPrompt.body, "Prompt copied", "Copy failed");
  }

  async function copyText(text: string, okMessage = "Copied", failMessage = "Copy failed") {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(okMessage);
      setCopyNotice(okMessage);
      setTimeout(() => {
        setCopyStatus("");
        setCopyNotice("");
      }, 1600);
    } catch {
      setCopyStatus(failMessage);
      setCopyNotice(failMessage);
      setTimeout(() => {
        setCopyStatus("");
        setCopyNotice("");
      }, 2200);
    }
  }

  function parseManualResult() {
    if (!onParseResult || !resultText.trim()) return;
    const result = onParseResult(resultText);
    setParseResult(result);
    if (result.ok) setResultText("");
  }

  async function copyCorrectionInstruction() {
    await copyText(buildWorkflowRecoveryPrompt(), "Recovery prompt copied");
  }

  async function sendCorrectionInstruction() {
    if (!currentStep?.agentId || !onSendWorkflowResultCorrectionToAgent || sendingCorrection) return;
    setSendingCorrection(true);
    setCorrectionNotice("");
    const result = await onSendWorkflowResultCorrectionToAgent({ agentId: currentStep.agentId });
    setCorrectionNotice(result.message);
    setSendingCorrection(false);
  }

  function focusManualPaste() {
    resultTextareaRef.current?.focus();
  }

  function captureResultFromAgent() {
    if (!currentStep?.agentId || !onCaptureWorkflowResultFromAgent) {
      setCaptureNotice("No target agent selected for this step. Paste the result manually or send the prompt to an agent first.");
      return;
    }
    const result = onCaptureWorkflowResultFromAgent({ agentId: currentStep.agentId });
    if (!result.ok) {
      setCaptureNotice(result.message);
      return;
    }
    const extraction = extractStructuredWorkflowOutput(result.text);
    setParseResult(null);
    setCaptureMeta(`Captured from ${result.agentLabel}: ${result.source === "selected_text" ? "selected terminal text" : "latest clean output block"}.`);
    if (extraction.validForParse) {
      setResultText(extraction.structuredText);
      setCaptureNotice(extraction.warning ?? result.message);
    } else {
      setResultText("");
      setCaptureNotice(extraction.warning ?? "Captured output has no structured blocks. Ask the agent to finish with CMDINO_RESULT and CMDINO_HANDOFF.");
    }
  }

  async function saveArtifact(
    key: string,
    action?: () => Promise<{ ok: boolean; message: string }>,
  ) {
    if (!action || savingArtifact) return;
    setSavingArtifact(key);
    const result = await action();
    setArtifactNotice(result.message);
    setSavingArtifact(null);
  }

  async function sendPromptToAgent() {
    if (!currentStepPrompt || !onSendWorkflowPromptToAgent) return;
    if (!selectedTarget) {
      setSendNotice("Choose a target agent before sending.");
      return;
    }
    if (!selectedTarget.isRunning) {
      setSendNotice("Start this agent before sending the workflow prompt.");
      return;
    }

    setSendingPrompt(true);
    setSendNotice("");
    const result = await onSendWorkflowPromptToAgent({
      agentId: selectedTarget.id,
      prompt: currentStepPrompt.body,
    });
    setSendNotice(result.message);
    setSendingPrompt(false);
  }

  return (
    <div className="main-task-chat">
      <div className="chat-shell">
        <div className="chat-hero">
          <div className="chat-hero-copy">
            <span className="chat-kicker">CMDino Chat</span>
            <h1 className="chat-title">Stage a checkpoint workflow.</h1>
            <p className="chat-subtitle">
              Set up agents in Agent Workspace, then describe your task here. CMDino prepares checkpoint prompts — you send them explicitly, capture results, and continue at your own pace.
            </p>
          </div>
          <div className="chat-context-grid">
            <div className="chat-context-item">
              <span className="chat-context-key">Project</span>
              <span className="chat-context-value">{projectName ?? "No project selected"}</span>
              <span className="chat-context-path">{projectPath ?? "Open a project folder to set agent working directory."}</span>
            </div>
            <div className="chat-context-item">
              <span className="chat-context-key">Running agents</span>
              <span className="chat-context-value">
                {runningAgentCount} of {totalAgentCount} active
              </span>
              <span className="chat-context-path">
                Chat sends checkpoint prompts after Agent Workspace setup.
              </span>
            </div>
          </div>
        </div>

        <div className="chat-main">
          <div className="chat-message-list">
            {projectRequired ? (
              <div className="chat-empty-state">
                <div className="chat-empty-primary">
                  <span className="chat-empty-title">Open a local project folder</span>
                  <p>
                    CMDino Chat needs a selected project before it can stage workflow prompts or save persistent project context.
                  </p>
                  <p>
                    Context Library is still available. Saving persistent context is blocked until a project folder is selected.
                  </p>
                  <div className="chat-setup-status">
                    <span className="chat-setup-badge chat-setup-badge--warn">
                      Project: No project selected
                    </span>
                    <span className="chat-setup-badge">
                      {totalAgentCount === 0
                        ? "No agents deployed"
                        : `${runningAgentCount} of ${totalAgentCount} agent${totalAgentCount !== 1 ? "s" : ""} running`}
                    </span>
                  </div>
                  <div className="chat-setup-actions">
                    <button className="chat-submit-btn" onClick={onOpenProject} disabled={!onOpenProject}>
                      Select Project Folder
                    </button>
                    <button className="chat-ghost-btn" onClick={onOpenAgents} disabled={!onOpenAgents}>
                      Open Agent Workspace
                    </button>
                    <button className="chat-ghost-btn" onClick={onOpenContextLibrary} disabled={!onOpenContextLibrary}>
                      Open Context Library
                    </button>
                  </div>
                </div>
                <div className="chat-empty-secondary">
                  <span className="chat-context-key">Setup order</span>
                  <strong>Project first</strong>
                  <span>Select a local folder so agents and context use the same workspace cwd.</span>
                  <div className="chat-empty-secondary-actions">
                    <button className="chat-mini-btn" onClick={onOpenContextLibrary} disabled={!onOpenContextLibrary}>Context</button>
                    <button className="chat-mini-btn" onClick={onOpenSetupCheck} disabled={!onOpenSetupCheck}>Setup Check</button>
                  </div>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="chat-empty-state">
                <div className="chat-empty-primary">
                  <span className="chat-empty-title">
                    {selectedTeam ? "Deploy the selected Agent Workspace team" : "Choose or deploy an Agent Workspace template"}
                  </span>
                  <p>
                    Chat uses one shared workspace team. Selecting a team plans workflow steps, but it does not create or start running agents.
                  </p>
                  <p>
                    Deploy the selected team in Agent Workspace, start the agents, then return here to stage a checkpoint workflow.
                  </p>
                  <div className="chat-setup-status">
                    <button
                      type="button"
                      className={noRunningAgents ? "chat-setup-badge chat-setup-badge--warn chat-setup-badge--button" : "chat-setup-badge chat-setup-badge--ok chat-setup-badge--button"}
                      onClick={() => setShowAgentDetails((value) => !value)}
                    >
                      {runningAgentCount} running agent{runningAgentCount !== 1 ? "s" : ""}
                      {totalAgentCount > 0 ? ` of ${totalAgentCount}` : ""}
                    </button>
                    <span className="chat-setup-badge">
                      Project: {projectPath ?? "No project path selected"}
                    </span>
                  </div>
                  {showAgentDetails && (
                    <div className="chat-agent-popover">
                      <div className="chat-agent-popover-title">Running agents</div>
                      {workflowAgentTargets.length === 0 ? (
                        <span className="chat-agent-popover-empty">No agents are deployed yet.</span>
                      ) : (
                        workflowAgentTargets.map((agent) => {
                          const cwdHealth = getAgentCwdHealth({
                            agentCwd: agent.cwd,
                            selectedProjectRoot: projectPath,
                          });
                          return (
                            <div className="chat-agent-row" key={agent.id}>
                              <div>
                                <strong>{agent.label}</strong>
                                <span>{agent.isRunning ? "running" : agent.lifecycle ?? "dormant"}</span>
                              </div>
                              <code>{agent.cwd ?? "No cwd configured"}</code>
                              <em>{cwdHealth.label}</em>
                              {cwdHealth.warning && <em>{cwdHealth.warning}</em>}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                  {agentTeams.length > 0 && onSelectAgentTeam && (
                    <AgentTeamSelector
                      teams={agentTeams}
                      selectedTeamId={selectedAgentTeamId}
                      onSelectTeam={onSelectAgentTeam}
                      disabled={teamLocked}
                    />
                  )}
                  <div className="chat-setup-actions">
                    {selectedTeam && (
                      <button className="chat-submit-btn" onClick={onDeploySelectedTeam} disabled={!onDeploySelectedTeam}>
                        Deploy this team in Agent Workspace
                      </button>
                    )}
                    <button className="chat-ghost-btn" onClick={onOpenContextLibrary} disabled={!onOpenContextLibrary}>
                      Open Context Library
                    </button>
                    <button className="chat-ghost-btn" onClick={onOpenProject} disabled={!onOpenProject}>
                      {projectPath ? "Switch Project Folder" : "Select Project Folder"}
                    </button>
                    <button className="chat-submit-btn" onClick={onOpenAgents} disabled={!onOpenAgents}>
                      Open Agent Workspace
                    </button>
                  </div>
                </div>
                <div className="chat-empty-secondary">
                  <span className="chat-context-key">Workspace team</span>
                  <strong>{selectedTeam?.name ?? "No team selected"}</strong>
                  <span>{teamStepLabels ?? "Choose a shared team before staging a workflow."}</span>
                  <div className="chat-empty-secondary-actions">
                    {selectedTeam && (
                      <button className="chat-mini-btn" onClick={onDeploySelectedTeam} disabled={!onDeploySelectedTeam}>Deploy Team</button>
                    )}
                    <button className="chat-mini-btn" onClick={onOpenSetupCheck} disabled={!onOpenSetupCheck}>Setup Check</button>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessageCard
                  key={message.id}
                  message={message}
                  onOpenAgents={onOpenAgents}
                  onOpenSetupCheck={onOpenSetupCheck}
                  interventions={interventions}
                  onInterventionAction={onInterventionAction}
                />
              ))
            )}
          </div>

          {!projectRequired && openInterventions.length > 0 && (
            <div className="chat-active-interventions">
              <div className="chat-active-interventions-title">
                Active Interventions ({openInterventions.length})
              </div>
              <div className="chat-active-interventions-list">
                {openInterventions.map((intervention) => (
                  <InterventionChatCard
                    key={intervention.id}
                    message={{
                      id: intervention.id,
                      kind: "intervention_required",
                      createdAt: intervention.createdAt,
                      interventionId: intervention.id,
                      title: intervention.title,
                      message: intervention.message,
                      targetAgentId: intervention.agentId,
                      targetStepId: intervention.stepId,
                    }}
                    intervention={intervention}
                    onOpenAgents={onOpenAgents}
                    onOpenSetupCheck={onOpenSetupCheck}
                    onInterventionAction={onInterventionAction}
                  />
                ))}
              </div>
            </div>
          )}

          {!projectRequired && (noRunningAgents || Boolean(selectedTeam && !selectedTeamDeployed)) && !currentRun && messages.length > 0 && (
            <div className="chat-setup-guidance">
              <div className="chat-setup-heading">
                {selectedTeam ? `${selectedTeam.name} is not deployed` : "Choose or deploy an Agent Workspace template"}
              </div>
              <p className="chat-setup-copy">
                CMDino Chat sends checkpoint prompts to running local agents. The selected team is only a plan until Agent Workspace agents are deployed and started.
              </p>
              <ol className="chat-setup-steps">
                <li>Open Agent Workspace — add the agents you want to run</li>
                <li>Start the agents</li>
                <li>Return to Chat and describe your task</li>
                <li>Send the generated checkpoint prompt to a running agent</li>
                <li>Capture the result and continue to the next checkpoint</li>
              </ol>
              <div className="chat-setup-status">
                <span className="chat-setup-badge chat-setup-badge--warn">
                  {totalAgentCount === 0
                    ? "No agents deployed"
                    : `${runningAgentCount} of ${totalAgentCount} agent${totalAgentCount !== 1 ? "s" : ""} running`}
                </span>
                {projectPath && (
                  <span className="chat-setup-badge">Project: {projectPath}</span>
                )}
              </div>
              <div className="chat-setup-actions">
                {selectedTeam && (
                  <button className="chat-submit-btn" onClick={onDeploySelectedTeam} disabled={!onDeploySelectedTeam}>
                    Deploy this team in Agent Workspace
                  </button>
                )}
                <button className="chat-ghost-btn" onClick={onOpenContextLibrary} disabled={!onOpenContextLibrary}>
                  Open Context Library
                </button>
                <button className="chat-submit-btn" onClick={onOpenAgents} disabled={!onOpenAgents}>
                  Open Agent Workspace
                </button>
              </div>
            </div>
          )}

          {!projectRequired && !noRunningAgents && (!selectedTeam || selectedTeamDeployed) && !currentRun && messages.length > 0 && (
            <div className="chat-agent-readiness">
              <button
                type="button"
                className="chat-setup-badge chat-setup-badge--ok chat-setup-badge--button"
                onClick={() => setShowAgentDetails((value) => !value)}
              >
                {runningAgentCount} of {totalAgentCount} agent{totalAgentCount !== 1 ? "s" : ""} running
              </button>
              {projectPath && (
                <span className="chat-setup-badge">Project: {projectPath}</span>
              )}
              {showAgentDetails && (
                <div className="chat-agent-popover">
                  <div className="chat-agent-popover-title">Running agents</div>
                  {workflowAgentTargets.map((agent) => {
                    const cwdHealth = getAgentCwdHealth({
                      agentCwd: agent.cwd,
                      selectedProjectRoot: projectPath,
                    });
                    return (
                      <div className="chat-agent-row" key={agent.id}>
                        <div>
                          <strong>{agent.label}</strong>
                          <span>{agent.isRunning ? "running" : agent.lifecycle ?? "dormant"}</span>
                        </div>
                        <code>{agent.cwd ?? "No cwd configured"}</code>
                        <em>{cwdHealth.label}</em>
                        {cwdHealth.warning && <em>{cwdHealth.warning}</em>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!projectRequired && agentTeams.length > 0 && !currentRun && messages.length > 0 && onSelectAgentTeam && (
            <AgentTeamSelector
              teams={agentTeams}
              selectedTeamId={selectedAgentTeamId}
              onSelectTeam={onSelectAgentTeam}
              disabled={teamLocked}
            />
          )}

          {!projectRequired && currentRun && (
            <div className="chat-checkpoint-panel">
              <div className="chat-checkpoint-header">
                <div>
                  <span className="chat-checkpoint-kicker">Checkpoint Mode</span>
                  <div className="chat-checkpoint-title">
                    {currentStep ? `Current Step: ${currentStep.label}` : "Workflow complete"}
                  </div>
                </div>
                <span className="chat-checkpoint-status">{currentRun.status.replace(/_/g, " ")}</span>
              </div>
              <WorkflowRunTimeline
                run={currentRun}
                agentTeamName={agentTeamName}
                bindings={workflowStepBindings}
                onCopySummary={(step) => {
                  if (step.summary) void copyText(step.summary, "Summary copied");
                }}
              />
              {copyStatus && <span className="chat-copy-notice">{copyStatus}</span>}

              {currentStep && currentStepPrompt && (
                <div className="chat-step-prompt">
                  {previousSteps.length > 0 && (
                    <details className="chat-previous-context">
                      <summary>Previous steps included in this prompt</summary>
                      <div className="chat-previous-context-list">
                        {previousSteps.map((step) => (
                          <div key={step.stepId} className="chat-previous-context-item">
                            <strong>{step.label}</strong>
                            <span>Summary: {step.summary}</span>
                            {step.handoff && <span>Handoff: {step.handoff}</span>}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                  <div className="chat-target-row">
                    <label htmlFor="workflow-target-agent">Target Agent</label>
                    {workflowAgentTargets.length === 0 ? (
                      <span className="chat-target-help">No agents deployed yet. Open Agent Workspace to add/start an agent.</span>
                    ) : (
                      <select
                        id="workflow-target-agent"
                        value={selectedTargetAgentId}
                        onChange={(e) => {
                          setSelectedTargetAgentId(e.target.value);
                          setSendNotice("");
                        }}
                      >
                        <option value="">Select an agent...</option>
                        {workflowAgentTargets.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.label}{agent.isSuggested ? " - suggested" : ""} ({agent.isRunning ? "running" : agent.lifecycle ?? "dormant"})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="chat-step-prompt-row">
                    <span>Prompt ready for {currentStep.agentRole}.</span>
                    <div className="chat-step-actions">
                      <button className="chat-ghost-btn" onClick={() => setPromptExpanded((value) => !value)}>
                        {promptExpanded ? "Hide Prompt" : "Preview Prompt"}
                      </button>
                      <button className="chat-ghost-btn" onClick={() => { void copyPrompt(); }}>
                        Copy Prompt
                      </button>
                      <button
                        className="chat-submit-btn"
                        onClick={() => { void sendPromptToAgent(); }}
                        disabled={!canSendPrompt}
                        title={
                          promptCannotBeSent
                            ? "Prompt is not ready to send for this checkpoint state"
                            : selectedTeam && !selectedTeamDeployed
                            ? "Deploy the selected Agent Workspace team before sending"
                            : !selectedTarget
                            ? "Select a target agent"
                            : selectedTarget.isRunning
                              ? `Send prompt to ${selectedTarget.label}`
                              : "Start this agent before sending"
                        }
                      >
                        {sendingPrompt ? "Sending..." : "Send Prompt to Agent"}
                      </button>
                      {onOpenAgents && (
                        <button className="chat-ghost-btn" onClick={onOpenAgents}>Open Agent Workspace</button>
                      )}
                    </div>
                  </div>
                  {copyNotice && <span className="chat-copy-notice">{copyNotice}</span>}
                  {selectedTarget && !selectedTarget.isRunning && (
                    <span className="chat-send-warning">Start this agent before sending the workflow prompt.</span>
                  )}
                  {selectedTeam && !selectedTeamDeployed && (
                    <span className="chat-send-warning">
                      {selectedTeam.name} is selected but not deployed in Agent Workspace. Deploy this team before sending workflow prompts.
                    </span>
                  )}
                  {selectedTargetCwdHealth?.status === "different" && (
                    <span className="chat-send-warning">{selectedTargetCwdHealth.warning}</span>
                  )}
                  {selectedTargetIsSuggested && (
                    <span className="chat-target-help">Suggested from this team's preferred provider and checkpoint role. You can choose a different running agent.</span>
                  )}
                  {sendNotice && (
                    <span className={sendNotice.startsWith("Sent ") ? "chat-copy-notice" : "chat-send-warning"}>
                      {sendNotice}
                    </span>
                  )}
                  {promptExpanded && (
                    <pre className="chat-prompt-preview">{currentStepPrompt.body}</pre>
                  )}
                </div>
              )}

              {currentStep && (
                <div className="chat-result-parser">
                  <div className="chat-result-header">
                    <div>
                      <label>Result for Current Step</label>
                      <span>
                        Capture reads selected terminal text when available, otherwise the latest clean output block. Review before parsing.
                      </span>
                    </div>
                    <div className="chat-result-actions">
                      <button
                        className="chat-ghost-btn"
                        onClick={captureResultFromAgent}
                        disabled={!canCaptureResult}
                        title={
                          currentStep.agentId
                            ? sentTarget?.isRunning
                              ? `Capture output from ${sentTarget.label}`
                              : "Start the target agent before capturing"
                            : "Send the prompt to an agent first"
                        }
                      >
                        Capture Result From Agent
                      </button>
                      <button className="chat-ghost-btn" onClick={focusManualPaste}>
                        Paste Manually
                      </button>
                    </div>
                  </div>
                  {!currentStep.agentId && (
                    <span className="chat-send-warning">
                      No target agent selected for this step. Paste the result manually or send the prompt to an agent first.
                    </span>
                  )}
                  {currentStep.agentId && sentTarget && !sentTarget.isRunning && (
                    <span className="chat-send-warning">
                      Start {sentTarget.label} before capturing, or paste the result manually.
                    </span>
                  )}
                  {captureNotice && (
                    <span className={captureNotice.startsWith("Captured ") ? "chat-copy-notice" : "chat-send-warning"}>
                      {captureNotice}
                    </span>
                  )}
                  {captureMeta && (
                    <span className="chat-capture-meta">{captureMeta}</span>
                  )}
                  <textarea
                    ref={resultTextareaRef}
                    value={resultText}
                    onChange={(e) => setResultText(e.target.value)}
                    placeholder={'Paste output containing <CMDINO_RESULT>{...}</CMDINO_RESULT>'}
                  />
                  {canContinue && (
                    <div className="chat-continuation-review">
                      <div>
                        <strong>{currentStep.label} completed.</strong>
                        <span>
                          {nextStep
                            ? `Next: ${nextStep.label}. The next prompt will include completed summaries and handoff text.`
                            : "This is the final checkpoint. Continue will generate the workflow summary."}
                        </span>
                      </div>
                      {currentHandoff && (
                        <details className="chat-handoff-review">
                          <summary>Review handoff</summary>
                          <pre>{currentHandoff}</pre>
                          <button
                            className="chat-mini-btn"
                            onClick={() => { void copyText(currentHandoff, "Handoff copied"); }}
                          >
                            Copy Handoff
                          </button>
                        </details>
                      )}
                    </div>
                  )}
                  <div className="chat-result-actions">
                    <button
                      className="chat-ghost-btn"
                      onClick={parseManualResult}
                      disabled={!onParseResult || !resultText.trim()}
                    >
                      Parse Result
                    </button>
                    <button
                      className="chat-submit-btn"
                      onClick={onContinueWorkflow}
                      disabled={!canContinue || !onContinueWorkflow}
                      title={canContinue
                        ? nextStep
                          ? `Prepare ${nextStep.label}. No prompt will be sent automatically.`
                          : "Finish workflow and show the final summary."
                        : "Complete this checkpoint first"}
                    >
                      {nextStep ? `Continue to ${nextStep.label}` : "Finish Workflow"}
                    </button>
                    {onCancelWorkflow && (
                      <button className="chat-ghost-btn" onClick={onCancelWorkflow}>Cancel Run</button>
                    )}
                  </div>
                  {parseResult && (
                    <div className={parseResult.ok ? "chat-parse-ok" : "chat-parse-error"}>
                      {parseResult.ok
                        ? `Parsed: ${parseResult.result.status} - ${parseResult.result.summary}`
                        : (
                          <>
                            <strong>{parseFailureTitle(parseResult)}</strong>
                            <span>{parseFailureDetail(parseResult)}</span>
                            {parseResult.reason === "missing_block" && (
                              <div className="chat-parse-recovery-actions">
                                <button
                                  className="chat-mini-btn"
                                  onClick={() => { void sendCorrectionInstruction(); }}
                                  disabled={!currentStep.agentId || !onSendWorkflowResultCorrectionToAgent || sendingCorrection}
                                >
                                  {sendingCorrection ? "Sending..." : "Ask agent to finish"}
                                </button>
                                <button className="chat-mini-btn" onClick={() => { void copyCorrectionInstruction(); }}>
                                  Copy recovery prompt
                                </button>
                              </div>
                            )}
                            {correctionNotice && <span>{correctionNotice}</span>}
                          </>
                        )}
                    </div>
                  )}
                </div>
              )}

              {!currentStep && currentRun.finalOutput && (
                <div className="chat-final-panel">
                  <div className="chat-result-actions">
                    <strong>Workflow Complete</strong>
                    <button
                      className="chat-ghost-btn"
                      onClick={() => { void copyText(currentRun.finalOutput ?? "", "Final output copied"); }}
                    >
                      Copy Final Output
                    </button>
                    <button
                      className="chat-ghost-btn"
                      onClick={() => { void copyText(buildWorkflowStepArtifactsMarkdown(currentRun), "Step artifacts copied"); }}
                    >
                      Copy Step Artifacts
                    </button>
                    <button
                      className="chat-ghost-btn"
                      onClick={() => { void copyText(buildBuildInPublicDraft(currentRun), "Build draft copied"); }}
                    >
                      Copy Build Draft
                    </button>
                    <button
                      className="chat-submit-btn"
                      onClick={() => { void saveArtifact("final", onSaveWorkflowFinalOutput); }}
                      disabled={!onSaveWorkflowFinalOutput || savingArtifact !== null}
                    >
                      {savingArtifact === "final" ? "Saving..." : "Save Final Output"}
                    </button>
                    <button
                      className="chat-ghost-btn"
                      onClick={() => { void saveArtifact("steps", onSaveWorkflowStepArtifacts); }}
                      disabled={!onSaveWorkflowStepArtifacts || savingArtifact !== null}
                    >
                      {savingArtifact === "steps" ? "Saving..." : "Save Step Artifacts"}
                    </button>
                    <button
                      className="chat-ghost-btn"
                      onClick={() => { void saveArtifact("draft", onSaveWorkflowBuildPublicDraft); }}
                      disabled={!onSaveWorkflowBuildPublicDraft || savingArtifact !== null}
                    >
                      {savingArtifact === "draft" ? "Saving..." : "Save Build Draft"}
                    </button>
                  </div>
                  {artifactNotice && (
                    <span className={artifactNotice.includes("saved") ? "chat-copy-notice" : "chat-send-warning"}>
                      {artifactNotice}
                    </span>
                  )}
                  <pre className="chat-final-output">{currentRun.finalOutput}</pre>
                </div>
              )}
            </div>
          )}

          <div className="chat-composer">
            <textarea
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              disabled={projectRequired || teamRequired}
              placeholder={projectRequired
                ? "Select a local project folder before staging a task."
                : teamRequired
                  ? "Choose an Agent Workspace team before staging a workflow."
                : "Describe what you want to build, fix, refactor, or review..."}
            />
            <div className="chat-composer-footer">
              <span>
                {projectRequired
                  ? "Task composer requires a selected local project folder."
                  : teamRequired
                    ? "Choose a shared Agent Workspace team before staging a workflow."
                  : "CMDino runs local CLI agents in your project workspace. You stay in control when intervention is needed."}
              </span>
              <div className="chat-composer-actions">
                {onOpenProject && (
                  <button className="chat-ghost-btn" onClick={onOpenProject}>
                    {projectRequired ? "Select Project" : "Project"}
                  </button>
                )}
                {projectRequired && onOpenContextLibrary && (
                  <button className="chat-ghost-btn" onClick={onOpenContextLibrary}>Context Library</button>
                )}
                {onOpenAgents && (
                  <button className="chat-ghost-btn" onClick={onOpenAgents}>Agents</button>
                )}
                {onClear && !projectRequired && messages.length > 0 && (
                  <button className="chat-ghost-btn" onClick={onClear}>Clear</button>
                )}
                <button
                  className="chat-submit-btn"
                  onClick={submit}
                  disabled={projectRequired || teamRequired || !taskText.trim()}
                  title={projectRequired
                    ? "Select a local project folder before staging a task"
                    : teamRequired
                      ? "Choose an Agent Workspace team before staging a workflow"
                      : undefined}
                >
                  Stage Task
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
