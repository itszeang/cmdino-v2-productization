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
import { buildWorkflowStepArtifactsMarkdown } from "../domain/workflowArtifacts";
import type { CmdinoResultParseResult } from "../orchestration/cmdinoResultParser";
import type { BuiltStepPrompt } from "../orchestration/stepPromptBuilder";
import { AgentTeamSelector } from "./AgentTeamSelector";
import { WorkflowRunTimeline, type WorkflowTimelineBinding } from "./WorkflowRunTimeline";
import { getAgentCwdHealth } from "../domain/agentCwd";
import type { AgentInteraction } from "../domain/agentInteraction";
import { InteractionCard } from "./InteractionCard";

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
    rawCapturedOutput: string;
    cleanedCapturedOutput: string;
    message: string;
    source: "selected_text" | "latest_output";
    agentLabel: string;
  } | { ok: false; message: string };
  onSendWorkflowResultCorrectionToAgent?: (input: {
    agentId: string;
  }) => Promise<{ ok: boolean; message: string }>;
  onSaveWorkflowFinalOutput?: () => Promise<{ ok: boolean; message: string }>;
  onSaveWorkflowStepArtifacts?: () => Promise<{ ok: boolean; message: string }>;
  onGenerateBuildPublicKit?: () => Promise<{ ok: boolean; message: string }>;
  onGenerateMemoryBriefs?: () => Promise<{ ok: boolean; message: string }>;
  onParseResult?: (text: string) => CmdinoResultParseResult;
  onContinueWorkflow?: () => void;
  onCancelWorkflow?: () => void;
  onClear?: () => void;
  onOpenAgents?: () => void;
  onOpenProject?: () => void;
  onOpenContextLibrary?: () => void;
  onOpenSetupCheck?: () => void;
  onInterventionAction?: (intervention: Intervention, actionKind: InterventionActionKind) => void;
  pendingAgentInteractions?: AgentInteraction[];
  onOpenAgentTerminal?: (agentId: string) => void;
  onSendInteractionResponse?: (interactionId: string, agentId: string, text: string) => Promise<void>;
  onDismissInteraction?: (interactionId: string) => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function parseFailureTitle(result: CmdinoResultParseResult): string {
  if (result.ok) return "";
  if (result.reason === "missing_block") return "Missing CMDINO_RESULT_START block";
  if (result.reason === "invalid_json") return "Result block JSON is invalid";
  return "Result block shape is invalid";
}

function parseFailureDetail(result: CmdinoResultParseResult): string {
  if (result.ok) return "";
  if (result.reason === "missing_block") {
    return "Ask the agent to finish with CMDINO_RESULT_START / CMDINO_RESULT_END, then capture or paste again.";
  }
  if (result.reason === "invalid_json") {
    return "CMDino found the block, but JSON parsing failed. Ask the agent to resend valid JSON inside the block.";
  }
  return "Required fields: status, summary, artifacts, handoff, and next.";
}

function hasValidParsedResult(step: WorkflowRun["steps"][number] | null): boolean {
  const parsed = step?.parsedOutput;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
  const record = parsed as Record<string, unknown>;
  return (
    step?.status === "completed" &&
    record.status === "success" &&
    typeof record.summary === "string" &&
    Array.isArray(record.artifacts) &&
    record.handoff !== null &&
    typeof record.handoff === "object" &&
    !Array.isArray(record.handoff) &&
    Array.isArray(record.next)
  );
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
  onGenerateBuildPublicKit,
  onGenerateMemoryBriefs,
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
  pendingAgentInteractions = [],
  onOpenAgentTerminal,
  onSendInteractionResponse,
  onDismissInteraction,
}: MainTaskChatProps) {
  const [taskText, setTaskText] = useState("");
  const [resultText, setResultText] = useState("");
  const [rawCapturedOutput, setRawCapturedOutput] = useState("");
  const [cleanedCapturedOutput, setCleanedCapturedOutput] = useState("");
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
  const canContinue = hasValidParsedResult(currentStep);
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
  const teamStepLabels = activeTeam?.steps.map((step) => step.label).join(" → ");
  const teamLocked = Boolean(currentRun && currentRun.status !== "completed" && currentRun.status !== "cancelled");
  const runningAgentCount = workflowAgentTargets.filter((a) => a.isRunning).length;
  const totalAgentCount = workflowAgentTargets.length;
  const noRunningAgents = runningAgentCount === 0;
  const projectRequired = !projectPath;
  const teamRequired = !selectedAgentTeamId;
  const agentsNotReady = noRunningAgents || Boolean(selectedTeam && !selectedTeamDeployed);

  useEffect(() => {
    setSelectedTargetAgentId("");
    setSendNotice("");
    setCaptureNotice("");
    setCaptureMeta("");
    setCorrectionNotice("");
    setArtifactNotice("");
    setCopyStatus("");
    setRawCapturedOutput("");
    setCleanedCapturedOutput("");
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
      setTimeout(() => { setCopyStatus(""); setCopyNotice(""); }, 1600);
    } catch {
      setCopyStatus(failMessage);
      setCopyNotice(failMessage);
      setTimeout(() => { setCopyStatus(""); setCopyNotice(""); }, 2200);
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
    const extraction = extractStructuredWorkflowOutput(result.rawCapturedOutput);
    setRawCapturedOutput(extraction.rawCapturedOutput || result.rawCapturedOutput);
    setCleanedCapturedOutput(extraction.cleanedCapturedOutput || result.cleanedCapturedOutput);
    setParseResult(null);
    setCaptureMeta(`Captured from ${result.agentLabel}: ${result.source === "selected_text" ? "selected terminal text" : "latest clean output block"}.`);
    if (extraction.validForParse) {
      setResultText(extraction.structuredText);
      setCaptureNotice(extraction.warning ?? result.message);
    } else {
      setResultText(extraction.cleanedCapturedOutput);
      setCaptureNotice(extraction.warning ?? "Captured output has no structured result block. Ask the agent to finish with CMDINO_RESULT_START / CMDINO_RESULT_END.");
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
    if (!selectedTarget) { setSendNotice("Choose a target agent before sending."); return; }
    if (!selectedTarget.isRunning) { setSendNotice("Start this agent before sending the workflow prompt."); return; }
    setSendingPrompt(true);
    setSendNotice("");
    const result = await onSendWorkflowPromptToAgent({
      agentId: selectedTarget.id,
      prompt: currentStepPrompt.body,
    });
    setSendNotice(result.message);
    setSendingPrompt(false);
  }

  // ── Readiness list component (reused across gate screens) ──────────────────
  function ReadinessList({ showTeam = true }: { showTeam?: boolean }) {
    return (
      <div className="mc-readiness-list">
        <div className={`mc-readiness-item ${projectRequired ? "mc-readiness-item--warn" : "mc-readiness-item--ok"}`}>
          <span className="mc-readiness-dot" />
          <div className="mc-readiness-info">
            <span className="mc-readiness-label">Project</span>
            <span className="mc-readiness-value">{projectName ?? "Not selected"}</span>
          </div>
        </div>
        {showTeam && (
          <div className={`mc-readiness-item ${teamRequired ? "mc-readiness-item--warn" : "mc-readiness-item--ok"}`}>
            <span className="mc-readiness-dot" />
            <div className="mc-readiness-info">
              <span className="mc-readiness-label">Team</span>
              <span className="mc-readiness-value">{selectedTeam?.name ?? "Not selected"}</span>
            </div>
          </div>
        )}
        <div className={`mc-readiness-item ${noRunningAgents ? "mc-readiness-item--warn" : "mc-readiness-item--ok"}`}>
          <span className="mc-readiness-dot" />
          <div className="mc-readiness-info">
            <span className="mc-readiness-label">Agents</span>
            <span className="mc-readiness-value">
              {totalAgentCount === 0 ? "None deployed" : `${runningAgentCount}/${totalAgentCount} running`}
            </span>
          </div>
        </div>
        {teamStepLabels && (
          <div className="mc-readiness-item mc-readiness-item--neutral">
            <span className="mc-readiness-dot" />
            <div className="mc-readiness-info">
              <span className="mc-readiness-label">Flow</span>
              <span className="mc-readiness-value" style={{ fontSize: "10px", whiteSpace: "normal", lineHeight: "1.4" }}>
                {teamStepLabels}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Gate: project missing ──────────────────────────────────────────────────
  function ProjectGate() {
    return (
      <div className="mc-gate mc-gate--project">
        <div className="mc-gate-inner">
          <div className="mc-gate-icon-area">
            <span className="mc-gate-icon">📁</span>
          </div>
          <div className="mc-gate-copy">
            <h2 className="mc-gate-headline">Open a project folder</h2>
            <p className="mc-gate-desc">
              CMDino needs a project directory to set agent working directories, save context, and stage workflow prompts. Context Library is available without a project.
            </p>
            <div className="mc-gate-actions">
              <button className="chat-submit-btn mc-gate-primary-btn" onClick={onOpenProject} disabled={!onOpenProject}>
                Select Project Folder
              </button>
              <button className="chat-ghost-btn" onClick={onOpenAgents} disabled={!onOpenAgents}>
                Agent Workspace
              </button>
              <button className="chat-ghost-btn" onClick={onOpenContextLibrary} disabled={!onOpenContextLibrary}>
                Context Library
              </button>
              <button className="chat-ghost-btn" onClick={onOpenSetupCheck} disabled={!onOpenSetupCheck}>
                Setup Check
              </button>
            </div>
          </div>
          <ReadinessList />
        </div>
      </div>
    );
  }

  // ── Gate: team missing ─────────────────────────────────────────────────────
  function TeamGate() {
    return (
      <div className="mc-gate mc-gate--team">
        <div className="mc-gate-inner">
          <div className="mc-gate-icon-area">
            <span className="mc-gate-icon">🤝</span>
          </div>
          <div className="mc-gate-copy">
            <h2 className="mc-gate-headline">Choose an Agent Team</h2>
            <p className="mc-gate-desc">
              A team defines the workflow steps and which agent roles participate. Select one to plan your checkpoint sequence.
            </p>
            {agentTeams.length > 0 && onSelectAgentTeam && (
              <AgentTeamSelector
                teams={agentTeams}
                selectedTeamId={selectedAgentTeamId}
                onSelectTeam={onSelectAgentTeam}
                disabled={teamLocked}
              />
            )}
            <div className="mc-gate-actions">
              <button className="chat-submit-btn mc-gate-primary-btn" onClick={onOpenAgents} disabled={!onOpenAgents}>
                Open Agent Workspace
              </button>
              <button className="chat-ghost-btn" onClick={onOpenSetupCheck} disabled={!onOpenSetupCheck}>
                Setup Check
              </button>
            </div>
          </div>
          <ReadinessList />
        </div>
      </div>
    );
  }

  // ── Gate: agents not deployed / not running ────────────────────────────────
  function AgentsGate() {
    const needsDeploy = totalAgentCount === 0;
    return (
      <div className="mc-gate mc-gate--agents">
        <div className="mc-gate-inner">
          <div className="mc-gate-icon-area">
            <span className="mc-gate-icon">⚡</span>
          </div>
          <div className="mc-gate-copy">
            <h2 className="mc-gate-headline">
              {needsDeploy ? "Deploy your Agent Team" : "Start your agents"}
            </h2>
            <p className="mc-gate-desc">
              {needsDeploy
                ? "Your team plan is ready. Deploy it in Agent Workspace to create running Claude, Codex, or Ollama instances."
                : `${totalAgentCount} agent${totalAgentCount !== 1 ? "s" : ""} deployed but not running. Start them in Agent Workspace, then return here.`}
            </p>
            <div className="mc-flow-steps">
              {[
                "Open Agent Workspace",
                needsDeploy ? `Deploy ${selectedTeam?.name ?? "this team"}` : "Start the agents",
                "Return here and describe your task",
                "Approve and send each checkpoint prompt",
                "Capture the result, then continue",
              ].map((step, i) => (
                <div className="mc-flow-step" key={i}>
                  <span className="mc-flow-step-num">{i + 1}</span>
                  <span className="mc-flow-step-label">{step}</span>
                </div>
              ))}
            </div>
            {agentTeams.length > 0 && onSelectAgentTeam && (
              <AgentTeamSelector
                teams={agentTeams}
                selectedTeamId={selectedAgentTeamId}
                onSelectTeam={onSelectAgentTeam}
                disabled={teamLocked}
              />
            )}
            <div className="mc-gate-actions">
              {selectedTeam && (
                <button className="chat-submit-btn mc-gate-primary-btn" onClick={onDeploySelectedTeam} disabled={!onDeploySelectedTeam}>
                  Deploy {selectedTeam.name}
                </button>
              )}
              <button className="chat-submit-btn mc-gate-primary-btn" onClick={onOpenAgents} disabled={!onOpenAgents}>
                Open Agent Workspace
              </button>
              <button className="chat-ghost-btn" onClick={onOpenContextLibrary} disabled={!onOpenContextLibrary}>
                Context Library
              </button>
            </div>
          </div>
          <ReadinessList />
        </div>
      </div>
    );
  }

  // ── Gate: ready — compose ──────────────────────────────────────────────────
  function ReadyGate() {
    return (
      <div className="mc-gate mc-gate--ready">
        <div className="mc-gate-inner mc-gate-inner--ready">
          <div className="mc-gate-copy mc-gate-copy--ready">
            <span className="mc-gate-kicker">Mission Control Ready</span>
            <h2 className="mc-gate-headline mc-gate-headline--ready">What are we building?</h2>
            <p className="mc-gate-desc">
              Describe your task below. CMDino stages checkpoint prompts for each workflow step — you send them to running agents, capture results, and continue at your own pace.
            </p>
            <div className="mc-readiness-row">
              <div className="mc-readiness-item mc-readiness-item--ok mc-readiness-item--inline">
                <span className="mc-readiness-dot" />
                <span>{projectName}</span>
              </div>
              <div className="mc-readiness-item mc-readiness-item--ok mc-readiness-item--inline">
                <span className="mc-readiness-dot" />
                <span>{selectedTeam?.name ?? agentTeamName}</span>
              </div>
              <div className="mc-readiness-item mc-readiness-item--ok mc-readiness-item--inline">
                <span className="mc-readiness-dot" />
                <span>{runningAgentCount} agent{runningAgentCount !== 1 ? "s" : ""} running</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Which content to show in scroll region ─────────────────────────────────
  function ScrollContent() {
    if (projectRequired) return <ProjectGate />;

    if (messages.length === 0 && !currentRun) {
      if (teamRequired)     return <TeamGate />;
      if (agentsNotReady)   return <AgentsGate />;
      return <ReadyGate />;
    }

    return (
      <div className="chat-message-list">
        {messages.map((message) => (
          <ChatMessageCard
            key={message.id}
            message={message}
            onOpenAgents={onOpenAgents}
            onOpenSetupCheck={onOpenSetupCheck}
            interventions={interventions}
            onInterventionAction={onInterventionAction}
          />
        ))}
        {!currentRun && agentsNotReady && (
          <div className="mc-inline-guidance">
            <span className="mc-inline-guidance-title">
              {selectedTeam && !selectedTeamDeployed
                ? `${selectedTeam.name} is not deployed`
                : "No agents running"}
            </span>
            <p className="mc-inline-guidance-body">
              {totalAgentCount === 0
                ? "Deploy your team in Agent Workspace, start the agents, then describe your task."
                : `${totalAgentCount} agent${totalAgentCount !== 1 ? "s" : ""} deployed but none running. Start them in Agent Workspace.`}
            </p>
            <div className="mc-gate-actions">
              {selectedTeam && (
                <button className="chat-submit-btn" onClick={onDeploySelectedTeam} disabled={!onDeploySelectedTeam}>
                  Deploy {selectedTeam.name}
                </button>
              )}
              <button className="chat-submit-btn" onClick={onOpenAgents} disabled={!onOpenAgents}>
                Open Agent Workspace
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Checkpoint column content ──────────────────────────────────────────────
  function CheckpointPanel() {
    if (!currentRun) return null;
    return (
      <>
        <div className="mc-checkpoint-header">
          <div className="mc-checkpoint-title-group">
            <span className="mc-checkpoint-kicker">Active Workflow</span>
            <div className="mc-checkpoint-title">
              {currentStep ? currentStep.label : "Workflow Complete"}
            </div>
          </div>
          <span className="mc-checkpoint-status-badge">
            {currentRun.status.replace(/_/g, " ")}
          </span>
        </div>

        <div className="mc-checkpoint-body">
          <WorkflowRunTimeline
            run={currentRun}
            agentTeamName={agentTeamName}
            bindings={workflowStepBindings}
            onCopySummary={(step) => {
              if (step.summary) void copyText(step.summary, "Summary copied");
            }}
          />
          {copyStatus && <span className="chat-copy-notice">{copyStatus}</span>}

          {/* Send prompt to agent */}
          {currentStep && currentStepPrompt && (
            <div className="chat-step-prompt">
              {previousSteps.length > 0 && (
                <details className="chat-previous-context">
                  <summary>Context from previous steps</summary>
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

              <div className="mc-target-block">
                <div className="mc-target-label">Target Agent</div>
                {workflowAgentTargets.length === 0 ? (
                  <span className="chat-target-help">No agents deployed. Open Agent Workspace first.</span>
                ) : (
                  <select
                    className="mc-target-select"
                    id="workflow-target-agent"
                    value={selectedTargetAgentId}
                    onChange={(e) => { setSelectedTargetAgentId(e.target.value); setSendNotice(""); }}
                  >
                    <option value="">Select an agent…</option>
                    {workflowAgentTargets.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.label}{agent.isSuggested ? " ★" : ""} — {agent.isRunning ? "running" : agent.lifecycle ?? "dormant"}
                      </option>
                    ))}
                  </select>
                )}
                {selectedTargetIsSuggested && (
                  <span className="chat-target-help">Suggested for this checkpoint role.</span>
                )}
                {selectedTarget && !selectedTarget.isRunning && (
                  <span className="chat-send-warning">Start this agent before sending the prompt.</span>
                )}
                {selectedTeam && !selectedTeamDeployed && (
                  <span className="chat-send-warning">{selectedTeam.name} is not deployed in Agent Workspace.</span>
                )}
                {selectedTargetCwdHealth?.status === "different" && (
                  <span className="chat-send-warning">{selectedTargetCwdHealth.warning}</span>
                )}
              </div>

              <div className="mc-prompt-info-row">
                <span className="mc-prompt-role-label">Prompt for {currentStep.agentRole}</span>
                <div className="chat-step-actions">
                  <button className="chat-ghost-btn" onClick={() => setPromptExpanded((v) => !v)}>
                    {promptExpanded ? "Hide Prompt" : "Preview Prompt"}
                  </button>
                  <button className="chat-ghost-btn" onClick={() => { void copyPrompt(); }}>
                    Copy
                  </button>
                  <button
                    className="chat-submit-btn"
                    onClick={() => { void sendPromptToAgent(); }}
                    disabled={!canSendPrompt}
                    title={
                      promptCannotBeSent ? "Not ready for this checkpoint state"
                      : !selectedTarget ? "Select a target agent"
                      : selectedTarget.isRunning ? `Send to ${selectedTarget.label}`
                      : "Start this agent first"
                    }
                  >
                    {sendingPrompt ? "Sending…" : "Send Prompt"}
                  </button>
                  {onOpenAgents && (
                    <button className="chat-ghost-btn" onClick={onOpenAgents}>Workspace</button>
                  )}
                </div>
              </div>
              {copyNotice && <span className="chat-copy-notice">{copyNotice}</span>}
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

          {/* Capture result */}
          {currentStep && (
            <div className="chat-result-parser">
              <div className="mc-result-header">
                <span className="mc-result-label">Result — {currentStep.label}</span>
                <div className="chat-step-actions">
                  <button
                    className="chat-ghost-btn"
                    onClick={captureResultFromAgent}
                    disabled={!canCaptureResult}
                    title={
                      currentStep.agentId
                        ? sentTarget?.isRunning ? `Capture from ${sentTarget.label}` : "Start the target agent first"
                        : "Send the prompt to an agent first"
                    }
                  >
                    Capture
                  </button>
                  <button className="chat-ghost-btn" onClick={focusManualPaste}>Paste</button>
                </div>
              </div>
              {!currentStep.agentId && (
                <span className="chat-send-warning">Send the prompt to an agent first, then capture.</span>
              )}
              {currentStep.agentId && sentTarget && !sentTarget.isRunning && (
                <span className="chat-send-warning">Start {sentTarget.label} before capturing.</span>
              )}
              {captureNotice && (
                <span className={captureNotice.startsWith("Captured ") ? "chat-copy-notice" : "chat-send-warning"}>
                  {captureNotice}
                </span>
              )}
              {captureMeta && <span className="chat-capture-meta">{captureMeta}</span>}
              {(rawCapturedOutput || cleanedCapturedOutput) && (
                <details className="chat-previous-context">
                  <summary>Review captured output</summary>
                  <div className="chat-previous-context-list">
                    {cleanedCapturedOutput && (
                      <div className="chat-previous-context-item">
                        <strong>Cleaned</strong>
                        <span>{cleanedCapturedOutput}</span>
                      </div>
                    )}
                    {rawCapturedOutput && rawCapturedOutput !== cleanedCapturedOutput && (
                      <div className="chat-previous-context-item">
                        <strong>Raw transcript</strong>
                        <span>{rawCapturedOutput}</span>
                      </div>
                    )}
                  </div>
                </details>
              )}
              <textarea
                ref={resultTextareaRef}
                value={resultText}
                onChange={(e) => setResultText(e.target.value)}
                placeholder="Paste output containing CMDINO_RESULT_START … CMDINO_RESULT_END"
              />
              {canContinue && (
                <div className="chat-continuation-review">
                  <div>
                    <strong>{currentStep.label} completed.</strong>
                    <span>
                      {nextStep
                        ? `Next: ${nextStep.label}. The next prompt includes completed summaries and handoff text.`
                        : "Final checkpoint. Continue generates the workflow summary."}
                    </span>
                  </div>
                  {currentHandoff && (
                    <details className="chat-handoff-review">
                      <summary>Review handoff</summary>
                      <pre>{currentHandoff}</pre>
                      <button className="chat-mini-btn" onClick={() => { void copyText(currentHandoff, "Handoff copied"); }}>
                        Copy Handoff
                      </button>
                    </details>
                  )}
                </div>
              )}
              <div className="mc-result-actions">
                <button
                  className="chat-ghost-btn"
                  onClick={parseManualResult}
                  disabled={!onParseResult || !resultText.trim()}
                >
                  Parse
                </button>
                <button
                  className="chat-submit-btn"
                  onClick={onContinueWorkflow}
                  disabled={!canContinue || !onContinueWorkflow}
                  title={canContinue
                    ? nextStep ? `Prepare ${nextStep.label}` : "Finish workflow"
                    : "Complete this checkpoint first"}
                >
                  {nextStep ? `Continue → ${nextStep.label}` : "Finish Workflow"}
                </button>
                {onCancelWorkflow && (
                  <button className="chat-ghost-btn" onClick={onCancelWorkflow}>Cancel</button>
                )}
              </div>
              {parseResult && (
                <div className={parseResult.ok ? "chat-parse-ok" : "chat-parse-error"}>
                  {parseResult.ok
                    ? `✓ ${parseResult.result.status} — ${parseResult.result.summary}`
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
                              {sendingCorrection ? "Sending…" : "Ask agent to finish"}
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

          {/* Workflow complete: final output */}
          {!currentStep && currentRun.finalOutput && (
            <div className="chat-final-panel">
              <div className="mc-result-actions">
                <strong>Workflow Complete</strong>
                <button className="chat-ghost-btn" onClick={() => { void copyText(currentRun.finalOutput ?? "", "Final output copied"); }}>
                  Copy Output
                </button>
                <button className="chat-ghost-btn" onClick={() => { void copyText(buildWorkflowStepArtifactsMarkdown(currentRun), "Step artifacts copied"); }}>
                  Copy Artifacts
                </button>
                <button
                  className="chat-submit-btn"
                  onClick={() => { void saveArtifact("final", onSaveWorkflowFinalOutput); }}
                  disabled={!onSaveWorkflowFinalOutput || savingArtifact !== null}
                >
                  {savingArtifact === "final" ? "Saving…" : "Save Output"}
                </button>
                <button className="chat-ghost-btn" onClick={() => { void saveArtifact("steps", onSaveWorkflowStepArtifacts); }} disabled={!onSaveWorkflowStepArtifacts || savingArtifact !== null}>
                  {savingArtifact === "steps" ? "Saving…" : "Save Artifacts"}
                </button>
                <button className="chat-ghost-btn" onClick={() => { void saveArtifact("build-public-kit", onGenerateBuildPublicKit); }} disabled={!onGenerateBuildPublicKit || savingArtifact !== null}>
                  {savingArtifact === "build-public-kit" ? "Generating…" : "Build-in-Public Kit"}
                </button>
                <button className="chat-ghost-btn" onClick={() => { void saveArtifact("memory-briefs", onGenerateMemoryBriefs); }} disabled={!onGenerateMemoryBriefs || savingArtifact !== null}>
                  {savingArtifact === "memory-briefs" ? "Generating…" : "Memory Brief"}
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
      </>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="main-task-chat">

      {/* ── Status strip ────────────────────────────────────────────────── */}
      <div className="mc-status-strip">
        <div className="mc-status-items">
          <button
            className={`mc-status-chip mc-status-chip--btn ${projectRequired ? "mc-status-chip--warn" : "mc-status-chip--ok"}`}
            onClick={onOpenProject}
            title={projectRequired ? "Select a project folder" : projectPath}
          >
            <span className="mc-status-dot" />
            <span className="mc-status-label">Project</span>
            <span className="mc-status-value">{projectName ?? "None"}</span>
          </button>

          <span className="mc-status-sep" />

          <div className={`mc-status-chip ${teamRequired ? "mc-status-chip--warn" : teamLocked ? "mc-status-chip--locked" : "mc-status-chip--ok"}`}>
            <span className="mc-status-dot" />
            <span className="mc-status-label">Team</span>
            <span className="mc-status-value">{selectedTeam?.name ?? agentTeamName ?? "None"}</span>
          </div>

          <span className="mc-status-sep" />

          <button
            className={`mc-status-chip mc-status-chip--btn ${noRunningAgents ? "mc-status-chip--warn" : "mc-status-chip--ok"}`}
            onClick={() => setShowAgentDetails((v) => !v)}
            title="Show agent status"
          >
            <span className="mc-status-dot" />
            <span className="mc-status-label">Agents</span>
            <span className="mc-status-value">
              {totalAgentCount === 0 ? "None deployed" : `${runningAgentCount}/${totalAgentCount} running`}
            </span>
          </button>
        </div>

        <div className="mc-status-strip-end">
          {currentRun && (
            <span className="mc-run-badge">{currentRun.status.replace(/_/g, " ")}</span>
          )}
          {onOpenSetupCheck && (
            <button className="mc-setup-btn" onClick={onOpenSetupCheck}>Setup Check</button>
          )}
          {onClear && !projectRequired && messages.length > 0 && (
            <button className="mc-ghost-chip" onClick={onClear}>Clear</button>
          )}
        </div>
      </div>

      {/* ── Agent popover ────────────────────────────────────────────────── */}
      {showAgentDetails && (
        <div className="mc-agent-popover">
          <div className="mc-agent-popover-header">
            <span className="mc-agent-popover-title">Deployed Agents</span>
            <button className="mc-ghost-chip" onClick={() => setShowAgentDetails(false)}>✕</button>
          </div>
          {workflowAgentTargets.length === 0 ? (
            <div className="mc-agent-popover-empty">
              No agents deployed yet. Open Agent Workspace to set up agents.
            </div>
          ) : (
            <div className="mc-agent-list">
              {workflowAgentTargets.map((agent) => {
                const cwdHealth = getAgentCwdHealth({ agentCwd: agent.cwd, selectedProjectRoot: projectPath });
                return (
                  <div className="mc-agent-row" key={agent.id}>
                    <div className="mc-agent-row-status">
                      <span className={`mc-agent-dot ${agent.isRunning ? "mc-agent-dot--running" : "mc-agent-dot--stopped"}`} />
                      <span className="mc-agent-row-label">{agent.label}</span>
                      <span className="mc-agent-row-lc">{agent.isRunning ? "running" : agent.lifecycle ?? "dormant"}</span>
                    </div>
                    <code className="mc-agent-row-cwd">{agent.cwd ?? "No cwd"}</code>
                    {cwdHealth.warning && <span className="mc-agent-row-warn">{cwdHealth.warning}</span>}
                  </div>
                );
              })}
            </div>
          )}
          <div className="mc-agent-popover-actions">
            {onOpenAgents && (
              <button className="chat-ghost-btn" onClick={() => { onOpenAgents(); setShowAgentDetails(false); }}>
                Open Agent Workspace
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className={`mc-body${currentRun ? " mc-body--split" : ""}`}>

        {/* Left column: messages + composer */}
        <div className="mc-main-col">

          {/* Active intervention banner */}
          {!projectRequired && openInterventions.length > 0 && (
            <div className="mc-intervention-banner">
              <div className="mc-intervention-banner-header">
                <span className="mc-intervention-banner-icon">⚠</span>
                <span className="mc-intervention-banner-title">
                  {openInterventions.length} Active Intervention{openInterventions.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="mc-intervention-banner-list">
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

          {/* Agent interaction cards */}
          {!projectRequired && pendingAgentInteractions.length > 0 && (
            <div className="mc-interaction-section">
              <div className="mc-interaction-section-header">
                <span className="mc-interaction-section-pulse" />
                <span className="mc-interaction-section-title">
                  {pendingAgentInteractions.length === 1
                    ? "1 agent waiting for input"
                    : `${pendingAgentInteractions.length} agents waiting for input`}
                </span>
                <span className="mc-interaction-section-hint">
                  This agent is waiting in its terminal.
                </span>
              </div>
              <div className="mc-interaction-cards">
                {pendingAgentInteractions.map((interaction) => (
                  <InteractionCard
                    key={interaction.interactionId}
                    interaction={interaction}
                    onOpenTerminal={
                      onOpenAgentTerminal
                        ? () => { onOpenAgentTerminal(interaction.agentId); }
                        : undefined
                    }
                    onSendResponse={onSendInteractionResponse ?? (async () => {})}
                    onDismiss={onDismissInteraction ?? (() => {})}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Scrollable content */}
          <div className="mc-scroll-region">
            <ScrollContent />
          </div>

          {/* Composer zone */}
          <div className="mc-composer-zone">
            {!projectRequired && agentTeams.length > 0 && !currentRun && onSelectAgentTeam && messages.length > 0 && (
              <AgentTeamSelector
                teams={agentTeams}
                selectedTeamId={selectedAgentTeamId}
                onSelectTeam={onSelectAgentTeam}
                disabled={teamLocked}
              />
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
                placeholder={
                  projectRequired
                    ? "Select a project folder before staging a task."
                    : teamRequired
                      ? "Choose an Agent Workspace team before staging a workflow."
                      : "Describe what you want to build, fix, refactor, or review… (Ctrl+Enter to submit)"
                }
              />
              <div className="chat-composer-footer">
                <span className="mc-composer-hint">
                  {projectRequired
                    ? "Requires a project folder."
                    : teamRequired
                      ? "Requires an Agent Workspace team."
                      : "CMDino runs local CLI agents. You stay in control at every checkpoint."}
                </span>
                <div className="chat-composer-actions">
                  {onOpenProject && (
                    <button className="chat-ghost-btn" onClick={onOpenProject}>
                      {projectRequired ? "Select Project" : "Project"}
                    </button>
                  )}
                  {projectRequired && onOpenContextLibrary && (
                    <button className="chat-ghost-btn" onClick={onOpenContextLibrary}>Context</button>
                  )}
                  {onOpenAgents && (
                    <button className="chat-ghost-btn" onClick={onOpenAgents}>Agents</button>
                  )}
                  <button
                    className="chat-submit-btn"
                    onClick={submit}
                    disabled={projectRequired || teamRequired || !taskText.trim()}
                    title={
                      projectRequired ? "Select a local project folder before staging a task"
                      : teamRequired ? "Choose an Agent Workspace team before staging a workflow"
                      : undefined
                    }
                  >
                    Stage Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: checkpoint panel (split view) */}
        {currentRun && (
          <div className="mc-checkpoint-col">
            <CheckpointPanel />
          </div>
        )}
      </div>
    </div>
  );
}
