import { useState, useRef, useEffect, useCallback } from "react";
import type { SessionLogEvent, SessionLogEventType } from "../domain/sessionLog";
import { DinoLane, type DinoVisualPhase } from "../dino/DinoLane";
import { LogsPanel }       from "./LogsPanel";
import { HandoffModal }    from "./HandoffModal";
import { ContextLibraryModal } from "./ContextLibraryModal";
import { RuntimeErrorCard } from "./RuntimeErrorCard";
import type { TerminalAgent }   from "../domain/terminalAgent";
import { extractReviewSendText } from "../domain/handoffProtocol";
import { getTerminalSubmitStrategy } from "../domain/workflowPromptSend";
import type { WorkflowLink, WorkflowLinkKind } from "../domain/workflow";
import type { AppSettings } from "../domain/appSettings";
import type { TerminalViewMode } from "../domain/viewMode";
import type { ReadinessFailure } from "../domain/readiness";
import type { GeneratedOutputFile } from "../domain/attachments";
import type { CmdinoContextManifest } from "../domain/contextLibrary";
import type { WorkflowResultCapture } from "../domain/workflowResultCapture";
import { validateAgentReadiness } from "../readiness/readinessBridge";
import { terminalBridge }  from "../terminal/terminalBridge";
import { getAgentCwdHealth } from "../domain/agentCwd";
import {
  useTerminalProcess,
  type TerminalLifecycleState,
} from "../terminal/useTerminalProcess";

// ── Colour maps ───────────────────────────────────────────────────────────────

const STATE_COLORS: Record<string, string> = {
  patrol_running:   "#e5e5e5",
  heavy_processing: "#d4d4d4",
  review_scan:      "#fbbf24",
  success_signal:   "#86efac",
  handoff_signal:   "#86efac",
  terminal_error:   "#fca5a5",
  terminal_dead:    "#6b7280",
  idle_center:      "#737373",
};


const VIEW_MODE_DINO_SCALE: Record<TerminalViewMode, number> = {
  focus: 1.25,
  grid: 0.85,
};

function dotColor(s: string) { return STATE_COLORS[s] ?? "#737373"; }

// ── Shared button primitives ──────────────────────────────────────────────────

function HdrBtn({
  title, onClick, onMouseDown, children, danger = false,
}: {
  title: string; onClick: () => void;
  onMouseDown?: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode; danger?: boolean;
}) {
  return (
    <button
      title={title} onClick={onClick} onMouseDown={onMouseDown}
      style={{ background: "transparent", border: "none", color: "var(--text-faint)", fontSize: 12,
        lineHeight: 1, cursor: "pointer", padding: "4px 6px", borderRadius: 999,
        fontFamily: "inherit", transition: "background 0.12s, color 0.12s", flexShrink: 0 }}
      onMouseEnter={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background = "var(--button-bg)";
        b.style.color = danger ? "var(--danger)" : "var(--text-main)";
      }}
      onMouseLeave={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background = "transparent";
        b.style.color = "var(--text-faint)";
      }}
    >{children}</button>
  );
}

function StripBtn({
  onClick, disabled = false, accent = false, title, children,
}: {
  onClick: () => void; disabled?: boolean; accent?: boolean;
  title?: string; children: React.ReactNode;
}) {
  const base  = accent ? "var(--accent)" : "var(--text-muted)";
  const bdBase = accent ? "var(--border-strong)" : "var(--border-subtle)";
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      style={{
        background: accent && !disabled ? "var(--button-bg)" : "transparent",
        border: `1px solid ${disabled ? "transparent" : bdBase}`,
        color: disabled ? "var(--text-faint)" : base,
        fontSize: 10, padding: "4px 9px", borderRadius: 999,
        fontFamily: "inherit", fontWeight: 600, letterSpacing: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        flexShrink: 0, whiteSpace: "nowrap", transition: "background 0.1s, color 0.1s, border-color 0.1s",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background = "var(--button-hover)";
        b.style.color = "var(--text-main)";
        b.style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background = accent && !disabled ? "var(--button-bg)" : "transparent";
        b.style.color = disabled ? "var(--text-faint)" : base;
        b.style.borderColor = disabled ? "var(--border-subtle)" : bdBase;
      }}
    >{children}</button>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  agent:                          TerminalAgent;
  selectedProjectRoot?:           string;
  onRemove:                       (id: string) => void;
  isRunning:                      boolean;
  onStart:                        () => void;
  allAgents:                      TerminalAgent[];
  runningAgentIds:                Set<string>;
  onAddAttachment:                (path: string, source?: "user" | "preset" | "generated") => void;
  onAddAttachmentToAgent?:        (agentId: string, path: string, source?: "user" | "preset" | "generated") => void;
  onRemoveAttachment:             (attachmentId: string) => void;
  onLifecycleChange:              (agentId: string, lifecycle: TerminalLifecycleState) => void;
  onRecordWorkflowLink:           (sourceAgentId: string, targetAgentId: string, kind: WorkflowLinkKind) => void;
  onEditAgent:                    (id: string) => void;
  readinessError:                 ReadinessFailure | null;
  onReadinessError:               (agentId: string, failure: ReadinessFailure | null) => void;
  settings?:                      AppSettings;
  viewMode:                       TerminalViewMode;
  isActive:                       boolean;
  onFocus?:                       () => void;
  workflowLinks:                  WorkflowLink[];
  onFocusTarget:                  (id: string) => void;
  onEvent?:                       (event: SessionLogEvent) => void;
  onRegisterTranscriptGetter?:    (agentId: string, getter: (() => string) | null) => void;
  onRegisterWorkflowResultCapture?: (agentId: string, getter: (() => WorkflowResultCapture) | null) => void;
  generatedOutputFiles?:          GeneratedOutputFile[];
  onRefreshGeneratedOutputs?:     () => void;
  onRegisterPaneRef?:             (agentId: string, el: HTMLElement | null) => void;
  onOpenHealth?:                  () => void;
  onContextManifestChange?:       (manifest: CmdinoContextManifest) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TerminalPane({
  agent, selectedProjectRoot, onRemove, isRunning, onStart,
  allAgents, runningAgentIds,
  onLifecycleChange, onRecordWorkflowLink, onEditAgent,
  readinessError, onReadinessError,
  settings,
  viewMode, isActive, onFocus,
  workflowLinks, onFocusTarget,
  onEvent,
  onRegisterTranscriptGetter,
  onRegisterWorkflowResultCapture,
  onRefreshGeneratedOutputs,
  onRegisterPaneRef,
  onOpenHealth,
  onContextManifestChange,
}: Props) {
  const containerRef      = useRef<HTMLDivElement>(null);
  const paneRootRef       = useRef<HTMLDivElement>(null);
  const prevLifecycleRef  = useRef<TerminalLifecycleState | null>(null);
  const isRestartingRef   = useRef(false);

  const {
    dinoState, lifecycle,
    lastRuntimeError, dismissRuntimeError,
    copyVisible, restart, kill,
    getSessionLogs, focusTerminal,
    captureSelectedText, captureSelectedOrLastLines, captureLastOutputBlock,
  } = useTerminalProcess({
    agentId:   agent.id,
    containerRef,
    cwd:       agent.cwd,
    launchCommand: agent.launchCommand,
    agentKind: agent.agentKind,
    enabled:   isRunning,
    fontScale: settings?.terminalFontScale ?? 1,
  });

  // Report lifecycle changes upward; log session events on meaningful transitions
  useEffect(() => {
    onLifecycleChange(agent.id, lifecycle);

    const prev = prevLifecycleRef.current;
    prevLifecycleRef.current = lifecycle;
    if (prev === null || prev === lifecycle) return;

    function makeEv(type: SessionLogEventType): SessionLogEvent {
      return {
        id: crypto.randomUUID(),
        ts: Date.now(),
        workspaceId: "",
        agentConfigId: agent.configId,
        agentLabel: agent.label,
        type,
        payload: {},
      };
    }

    if (lifecycle === "running") {
      const type: SessionLogEventType = isRestartingRef.current ? "terminal_restart" : "terminal_start";
      isRestartingRef.current = false;
      onEvent?.(makeEv(type));
    } else if (lifecycle === "killed") {
      onEvent?.(makeEv("terminal_kill"));
    } else if (lifecycle === "exited") {
      onEvent?.(makeEv("terminal_exited"));
    } else if (lifecycle === "error" && prev !== "dormant") {
      onEvent?.(makeEv("terminal_error"));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id, agent.configId, agent.label, lifecycle, onLifecycleChange, onEvent]);

  // Emit session log when a runtime error surfaces (dedup by occurredAt)
  const lastEmittedErrorAtRef = useRef<number>(0);
  useEffect(() => {
    if (!lastRuntimeError) return;
    if (lastRuntimeError.occurredAt === lastEmittedErrorAtRef.current) return;
    // Only log high/medium confidence errors
    if (lastRuntimeError.confidence === "low") return;
    lastEmittedErrorAtRef.current = lastRuntimeError.occurredAt;
    onEvent?.({
      id: crypto.randomUUID(),
      ts: lastRuntimeError.occurredAt,
      workspaceId: "",
      agentConfigId: agent.configId,
      agentLabel: agent.label,
      type: "runtime_error",
      payload: {
        kind:       lastRuntimeError.kind,
        title:      lastRuntimeError.title,
        message:    lastRuntimeError.message,
        nextAction: lastRuntimeError.nextAction,
        confidence: lastRuntimeError.confidence,
        source:     lastRuntimeError.source,
        rawSummary: lastRuntimeError.rawSummary,
        exitCode:   lastRuntimeError.exitCode,
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastRuntimeError, agent.configId, agent.label, onEvent]);

  // Register transcript getter so App-level export can read this pane's buffer
  useEffect(() => {
    if (!onRegisterTranscriptGetter) return;
    onRegisterTranscriptGetter(agent.id, getSessionLogs);
    return () => {
      onRegisterTranscriptGetter(agent.id, null);
    };
  }, [agent.id, getSessionLogs, onRegisterTranscriptGetter]);

  const captureWorkflowResult = useCallback(() => {
    // Sprint 7 result capture reuses the terminal process' xterm helpers:
    // selected text first, then the clean output block since the last user input.
    const selectedText = captureSelectedText().trimEnd();
    if (selectedText.trim()) return { text: selectedText, source: "selected_text" as const };
    return { text: captureLastOutputBlock().trimEnd(), source: "latest_output" as const };
  }, [captureLastOutputBlock, captureSelectedText]);

  useEffect(() => {
    if (!onRegisterWorkflowResultCapture) return;
    onRegisterWorkflowResultCapture(agent.id, captureWorkflowResult);
    return () => {
      onRegisterWorkflowResultCapture(agent.id, null);
    };
  }, [agent.id, captureWorkflowResult, onRegisterWorkflowResultCapture]);

  // Register pane root element for drag-drop hit-testing
  useEffect(() => {
    const el = paneRootRef.current;
    if (!el || !onRegisterPaneRef) return;
    onRegisterPaneRef(agent.id, el);
    return () => { onRegisterPaneRef(agent.id, null); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id, onRegisterPaneRef]);

  // ── Egg → hatch → dino spawn sequence ─────────────────────────────────────
  // Tracks which visual phase we're in so DinoLane shows egg assets before
  // the PTY is live, then briefly plays the hatch animation on first spawn.
  const lifecycleRef = useRef<TerminalLifecycleState>(lifecycle);
  const [dinoVisualPhase, setDinoVisualPhase] = useState<DinoVisualPhase>("egg_idle");

  useEffect(() => {
    lifecycleRef.current = lifecycle;

    if (lifecycle === "dormant") {
      setDinoVisualPhase("egg_idle");
      return;
    }

    if (lifecycle === "spawning") {
      setDinoVisualPhase((phase) => phase === "dino" ? "dino" : "egg_hatching");
      return;
    }

    if (lifecycle === "running") {
      setDinoVisualPhase((phase) => phase === "egg_idle" ? "egg_hatching" : phase);
      return;
    }

    if (lifecycle === "error" || lifecycle === "exited" || lifecycle === "killed") {
      setDinoVisualPhase("dino");
    }
  }, [lifecycle]);

  const handleEggHatchComplete = useCallback(() => {
    if (lifecycleRef.current === "running") {
      setDinoVisualPhase("dino");
    }
  }, []);

  // Derived dino state passed to DinoLane — overrides runtime dinoState
  // while dormant/spawning so the egg asset is shown instead of the dino.
  // ── UI state ───────────────────────────────────────────────────────────────

  const [showLogs,          setShowLogs]          = useState(false);
  const [handoffCapture,    setHandoffCapture]    = useState<{ outputText: string; selectedText: string } | null>(null);
  const [readinessChecking, setReadinessChecking] = useState(false);
  const [restarting,        setRestarting]        = useState(false);
  const [showAttPanel,      setShowAttPanel]      = useState(false);

  // Forward state
  const [selectedForwardTargetId, setSelectedForwardTargetId] = useState<string | null>(null);
  const [fwdError,   setFwdError]   = useState("");
  const [forwarding, setForwarding] = useState(false);

  // ── Derived ────────────────────────────────────────────────────────────────

  const color     = dotColor(dinoState);
  const pulse     = dinoState === "patrol_running" || dinoState === "heavy_processing";
  const dinoScale = (settings?.dinoScale ?? 1) * VIEW_MODE_DINO_SCALE[viewMode];
  const isAlive        = lifecycle === "running" || lifecycle === "spawning";
  const runningTargets = allAgents.filter((a) => a.id !== agent.id && runningAgentIds.has(a.id));
  const cwdHealth      = getAgentCwdHealth({ agentCwd: agent.cwd, selectedProjectRoot });

  // Defensive: attachments may be undefined on agents created before schema migration
  const atts = agent.attachments ?? [];

  // Forward target derivation: route > handoff > selected > first
  const otherTerminals = allAgents.filter((a) => a.id !== agent.id);
  const outgoingRoute   = workflowLinks
    .filter((l) => l.kind === "route" && l.sourceConfigId === agent.configId)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
  const outgoingHandoff = workflowLinks
    .filter((l) => l.kind === "handoff" && l.sourceConfigId === agent.configId)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
  const preferredLink  = outgoingRoute ?? outgoingHandoff ?? null;
  const linkedTarget   = preferredLink
    ? allAgents.find((a) => a.configId === preferredLink.targetConfigId && a.id !== agent.id) ?? null
    : null;
  const effectiveFwdTarget =
    linkedTarget ??
    otherTerminals.find((a) => a.id === selectedForwardTargetId) ??
    otherTerminals[0] ??
    null;
  const targetIsRunning = effectiveFwdTarget != null && runningAgentIds.has(effectiveFwdTarget.id);

  // ── Attachment panel actions ───────────────────────────────────────────────

  async function handleSendContextTextOnce(targetAgentId: string, content: string) {
    const target = allAgents.find((item) => item.id === targetAgentId);
    if (!target || !runningAgentIds.has(target.id)) return;
    await terminalBridge.submitLine(target.id, content, getTerminalSubmitStrategy(target.agentKind));
    onEvent?.({
      id: crypto.randomUUID(), ts: Date.now(), workspaceId: "",
      agentConfigId: agent.configId, agentLabel: agent.label,
      type: "manual_send",
      payload: { fileName: "Context Library", path: "cmdino-context://manual-send", targetLabel: target.label },
    });
  }

  function openAttPanel() {
    setShowAttPanel(true);
    onRefreshGeneratedOutputs?.();
  }

  function handleOpenHandoff() {
    setHandoffCapture({
      outputText: captureLastOutputBlock().trimEnd() || captureSelectedOrLastLines(50),
      selectedText: captureSelectedText().trimEnd(),
    });
  }

  async function handleForwardToNext() {
    if (!effectiveFwdTarget || !isAlive || !targetIsRunning || forwarding) return;
    setFwdError("");
    const extracted = extractReviewSendText({
      outputText: captureLastOutputBlock().trimEnd(),
      selectedText: captureSelectedText().trimEnd(),
    });
    if (!extracted.text) {
      setFwdError("No clean handoff found. Select text manually or ask the agent for CMDINO_HANDOFF.");
      return;
    }
    const captured = extracted.text.length > 32768 ? extracted.text.slice(0, 32768) : extracted.text;
    setForwarding(true);
    try {
      await terminalBridge.submitLine(
        effectiveFwdTarget.id,
        captured,
        getTerminalSubmitStrategy(effectiveFwdTarget.agentKind),
      );
      onRecordWorkflowLink(agent.id, effectiveFwdTarget.id, "handoff");
      onEvent?.({
        id: crypto.randomUUID(), ts: Date.now(), workspaceId: "",
        agentConfigId: agent.configId, agentLabel: agent.label,
        type: "auto_forward",
        payload: { targetLabel: effectiveFwdTarget.label, target: effectiveFwdTarget.configId },
      });
      onFocusTarget(effectiveFwdTarget.id);
    } catch (err) {
      setFwdError(err instanceof Error ? err.message : String(err));
    } finally {
      setForwarding(false);
    }
  }

  // ── Lifecycle header actions ───────────────────────────────────────────────

  async function handleRemove() {
    if (isAlive && !window.confirm(`Kill "${agent.label}"?`)) return;
    await kill();
    onEvent?.({
      id: crypto.randomUUID(), ts: Date.now(), workspaceId: "",
      agentConfigId: agent.configId, agentLabel: agent.label,
      type: "terminal_removed", payload: {},
    });
    onRemove(agent.id);
  }

  async function runReadinessAndStart() {
    setReadinessChecking(true);
    try {
      const result = await validateAgentReadiness(agent);
      if (!result.ok) {
        onReadinessError(agent.id, result.failure);
        return false;
      }
      onReadinessError(agent.id, null);
      return true;
    } finally {
      setReadinessChecking(false);
    }
  }

  async function handleStart() {
    const ok = await runReadinessAndStart();
    if (ok) onStart();
  }

  async function handleRestart() {
    // Guard against double-click and re-entry during restart / readiness check
    if (restarting || readinessChecking) return;
    if (isAlive && !window.confirm(`Restart "${agent.label}"?`)) return;
    isRestartingRef.current = true;
    setRestarting(true);
    try {
      // Validate before killing the current session.
      const ok = await runReadinessAndStart();
      if (ok) {
        await restart();
      } else {
        isRestartingRef.current = false;
      }
      // If !ok: error is shown; current running PTY stays alive.
    } finally {
      setRestarting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div ref={paneRootRef} style={{
      display: "flex", flexDirection: "column",
      background: "var(--surface-1)",
      border: `1px solid ${isActive && viewMode === "grid" ? "var(--border-strong)" : "var(--border-subtle)"}`,
      borderRadius: 12, overflow: "hidden", height: "100%",
      boxShadow: isActive && viewMode === "grid" ? "0 0 0 1px var(--border-strong)" : "none",
      position: "relative",
    }}>

      {/* ── Single chrome row: orchestration + pane controls ── */}
      <div className="pane-orch">

        {/* Left: context + handoff */}
        <div className="pane-orch-group">
          <StripBtn
            onClick={() => { showAttPanel ? setShowAttPanel(false) : openAttPanel(); }}
            accent={showAttPanel}
            title={showAttPanel ? "Close context library" : "Open persistent context library for this agent"}
          >
            {atts.length > 0 ? `Add Context (${atts.length})` : "Add Context"}
          </StripBtn>
          <div className="pane-strip-sep" />
          <StripBtn
            onClick={handleOpenHandoff}
            disabled={!isAlive}
            title={isAlive ? "Review and send output to another agent" : "Start terminal first"}
          >Review & Send</StripBtn>
        </div>

        {/* Middle/right: forward flow */}
        <div className="pane-orch-group pane-orch-group--end">
          <span style={{ color: "var(--text-faint)", fontSize: 10, flexShrink: 0, lineHeight: 1 }}>→</span>
          {linkedTarget ? (
            <span style={{
              fontSize: 10, color: "var(--text-muted)", flexShrink: 0,
              maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
              title={preferredLink?.kind === "route" ? "Preferred route" : "Observed handoff"}
            >
              {preferredLink?.kind === "route" ? "→ " : "↪ "}{linkedTarget.label}
            </span>
          ) : otherTerminals.length > 0 ? (
            <select
              value={effectiveFwdTarget?.id ?? ""}
              onChange={(e) => { setSelectedForwardTargetId(e.target.value); setFwdError(""); }}
              style={{
                background: "transparent", border: "1px solid var(--border-subtle)",
                color: "var(--text-muted)", fontSize: 9, padding: "3px 6px",
                borderRadius: 999, fontFamily: "inherit", maxWidth: 90, flexShrink: 1, minWidth: 0,
              }}
            >
              {otherTerminals.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          ) : (
            <span style={{ fontSize: 9, color: "var(--text-faint)", flexShrink: 0 }}>—</span>
          )}
          <StripBtn
            onClick={() => { void handleForwardToNext(); }}
            disabled={!isAlive || !effectiveFwdTarget || !targetIsRunning || forwarding || otherTerminals.length === 0}
            title={
              !isAlive                                            ? "Start this terminal first" :
              otherTerminals.length === 0 || !effectiveFwdTarget  ? "No targets"               :
              !targetIsRunning                                    ? "Start target first"        :
              forwarding                                          ? "Forwarding…"              :
              `Send marked handoff to ${effectiveFwdTarget.label}`
            }
          >
            {forwarding ? "…" : "Send Marked"}
          </StripBtn>
          {fwdError && (
            <span style={{ color: "var(--danger)", fontSize: 9, whiteSpace: "nowrap", flexShrink: 0 }}>
              {fwdError}
            </span>
          )}
        </div>

        {/* Far right: status dot + pane controls */}
        <div className="pane-orch-group" style={{ paddingLeft: 6, borderLeft: "1px solid var(--border-subtle)", gap: 1, flexShrink: 0 }}>
          <span
            title={cwdHealth.warning ?? agent.cwd ?? cwdHealth.label}
            style={{
              maxWidth: 112,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color:
                cwdHealth.status === "project"
                  ? "var(--success)"
                  : cwdHealth.status === "different"
                  ? "var(--warning)"
                  : "var(--text-faint)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0,
              padding: "2px 6px",
              border: "1px solid var(--border-subtle)",
              borderRadius: 999,
              flexShrink: 1,
            }}
          >
            {cwdHealth.label}
          </span>
          <div
            className={pulse ? "status-dot-pulse" : undefined}
            style={{
              width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0, marginRight: 2,
              boxShadow: dinoState !== "terminal_dead" && dinoState !== "idle_center"
                ? `0 0 0 2px ${color}1f` : "none",
              transition: "background 0.25s, box-shadow 0.25s",
            }}
          />
          <HdrBtn title="Copy visible output" onClick={() => { void copyVisible(); }}>⎘</HdrBtn>
          <HdrBtn title="View session logs" onClick={() => setShowLogs(true)}
            onMouseDown={(e) => e.preventDefault()}>≡</HdrBtn>
          <HdrBtn
            title={readinessChecking ? "Checking…" : restarting ? "Starting…" : "Restart terminal"}
            onClick={() => { if (!readinessChecking && !restarting) void handleRestart(); }}
          >↺</HdrBtn>
          <span className="pane-strip-sep" />
          {onFocus && (
            <HdrBtn
              title={viewMode === "focus" && isActive ? "Restore grid" : "Focus this terminal"}
              onClick={onFocus}
            >
              {viewMode === "focus" && isActive ? (
                <svg viewBox="0 0 10 10" width="10" height="10" fill="currentColor" style={{ display: "block" }}>
                  <rect x="1"   y="1"   width="3.5" height="3.5" rx="0.5" />
                  <rect x="5.5" y="1"   width="3.5" height="3.5" rx="0.5" />
                  <rect x="1"   y="5.5" width="3.5" height="3.5" rx="0.5" />
                  <rect x="5.5" y="5.5" width="3.5" height="3.5" rx="0.5" />
                </svg>
              ) : (
                <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                  <path d="M5.5 1H9v3.5M4.5 9H1V5.5M9 1L1 9"/>
                </svg>
              )}
            </HdrBtn>
          )}
          <HdrBtn title="Agent Settings" onClick={() => onEditAgent(agent.id)}>
            <svg viewBox="0 0 10 10" width="10" height="10" fill="currentColor" style={{ display: "block" }}>
              <path d="M5 3.2a1.8 1.8 0 1 0 0 3.6A1.8 1.8 0 0 0 5 3.2zm3.7-.5-.5-.87-.87.5A3.2 3.2 0 0 0 6 2.02V1h-2v1.02a3.2 3.2 0 0 0-1.33.31l-.87-.5-.5.87.87.5A3.2 3.2 0 0 0 1.83 5H.8v1h1.03a3.2 3.2 0 0 0 .31 1.33l-.87.5.5.87.87-.5A3.2 3.2 0 0 0 4 9.17V10h2V9.17a3.2 3.2 0 0 0 1.33-.3l.87.5.5-.87-.87-.5A3.2 3.2 0 0 0 8.17 7H9.2V6H8.17A3.2 3.2 0 0 0 7.87 4.7l.83-.5z"/>
            </svg>
          </HdrBtn>
          <HdrBtn title="Close terminal" onClick={() => { void handleRemove(); }} danger>✕</HdrBtn>
        </div>

      </div>

      {/* ── Attachment panel (collapsible) ── */}
      {showAttPanel && (
        <ContextLibraryModal
          agent={agent}
          allAgents={allAgents}
          projectRoot={selectedProjectRoot}
          runningAgentIds={runningAgentIds}
          defaultSendTargetAgentId={agent.id}
          onSendTextOnce={handleSendContextTextOnce}
          onManifestChange={onContextManifestChange}
          onClose={() => setShowAttPanel(false)}
        />
      )}

      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: "var(--terminal-bg)",
      }}>
        {/* Readiness error — shown as compact strip for running terminals */}
        {readinessError && isRunning && (
          <div className="readiness-error readiness-error--strip">
            <div className="readiness-error-body">
              <span className="readiness-error-title">Restart blocked</span>
              <span className="readiness-error-msg">{readinessError.message}</span>
            </div>
            <div className="readiness-error-actions">
              <button className="readiness-error-btn" onClick={() => onEditAgent(agent.id)}>Settings</button>
              <button
                className="readiness-error-btn"
                onClick={() => { void handleRestart(); }}
                disabled={readinessChecking}
              >
                {readinessChecking ? "…" : "Retry"}
              </button>
              <button
                className="readiness-error-dismiss"
                onClick={() => onReadinessError(agent.id, null)}
                title="Dismiss"
              >×</button>
            </div>
          </div>
        )}

        {/* Runtime error — compact strip above xterm when process is running */}
        {cwdHealth.status !== "project" && (
          <div className="readiness-error readiness-error--strip">
            <div className="readiness-error-body">
              <span className="readiness-error-title">{cwdHealth.label}</span>
              <span className="readiness-error-msg">
                {cwdHealth.warning}
                {cwdHealth.status === "different" ? " Stop and recreate or restart the agent with the selected project folder as cwd." : ""}
              </span>
            </div>
            <div className="readiness-error-actions">
              <button className="readiness-error-btn" onClick={() => onEditAgent(agent.id)}>Settings</button>
            </div>
          </div>
        )}

        {lastRuntimeError && isRunning && lastRuntimeError.confidence !== "low" && (
          <RuntimeErrorCard
            error={lastRuntimeError}
            variant="strip"
            onRetry={() => { void handleRestart(); }}
            onSettings={() => onEditAgent(agent.id)}
            onOpenHealth={onOpenHealth}
            onDismiss={dismissRuntimeError}
          />
        )}

        {isRunning ? (
          <div ref={containerRef} style={{ flex: 1, overflow: "hidden", minHeight: 0 }} />
        ) : readinessError ? (
          /* Dormant + readiness error: show error panel in place of normal dormant view */
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 0, minHeight: 0, padding: "0 16px",
          }}>
            <div className="readiness-error readiness-error--panel">
              <span className="readiness-error-title">Agent not ready</span>
              <span className="readiness-error-msg">{readinessError.message}</span>
              <div className="readiness-error-actions" style={{ marginTop: 10 }}>
                <button className="readiness-error-btn" onClick={() => onEditAgent(agent.id)}>
                  Agent Settings
                </button>
                <button
                  className="readiness-error-btn readiness-error-btn--accent"
                  onClick={() => { void handleStart(); }}
                  disabled={readinessChecking}
                >
                  {readinessChecking ? "Checking…" : "Retry"}
                </button>
              </div>
            </div>
          </div>
        ) : lastRuntimeError && lastRuntimeError.confidence !== "low" ? (
          /* Non-running pane with runtime error: centered panel */
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 0, minHeight: 0, padding: "0 16px",
          }}>
            <RuntimeErrorCard
              error={lastRuntimeError}
              variant="panel"
              onRetry={() => { void handleStart(); }}
              onSettings={() => onEditAgent(agent.id)}
              onOpenHealth={onOpenHealth}
              onDismiss={dismissRuntimeError}
            />
          </div>
        ) : (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 6, minHeight: 0,
          }}>
            <span style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 650, letterSpacing: 0 }}>
              {agent.label}
            </span>
            <span style={{ color: "var(--text-faint)", fontSize: 11, letterSpacing: 0 }}>Dormant</span>
            <span style={{ color: "var(--text-faint)", fontSize: 10, letterSpacing: 0, opacity: 0.6, marginBottom: 4 }}>
              Start when ready
            </span>
            <button
              onClick={() => { void handleStart(); }}
              disabled={readinessChecking}
              style={{
                padding: "9px 24px",
                background: readinessChecking ? "var(--button-bg)" : "var(--accent)",
                border: "1px solid transparent", borderRadius: 999,
                color: readinessChecking ? "var(--text-muted)" : "var(--app-bg)",
                fontSize: 12, fontFamily: "inherit",
                fontWeight: 650, letterSpacing: 0,
                cursor: readinessChecking ? "default" : "pointer", transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => { if (!readinessChecking) (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            >
              {readinessChecking ? "Checking…" : "Start"}
            </button>
          </div>
        )}

        <DinoLane
          dinoId={agent.dinoId}
          state={dinoState}
          animationSpeed={settings?.animationSpeed ?? 1}
          dinoScale={dinoScale}
          visualPhase={dinoVisualPhase}
          onEggHatchComplete={handleEggHatchComplete}
        />
      </div>

      {/* ── Logs overlay ── */}
      {showLogs && (
        <LogsPanel
          label={agent.label}
          lifecycle={lifecycle}
          getLogs={getSessionLogs}
          onClose={() => { setShowLogs(false); focusTerminal(); }}
        />
      )}

      {/* ── Handoff modal ── */}
      {handoffCapture !== null && (
        <HandoffModal
          sourceAgentId={agent.id}
          sourceLabel={agent.label}
          outputText={handoffCapture.outputText}
          selectedText={handoffCapture.selectedText}
          runningTargets={runningTargets}
          preferredTargetId={targetIsRunning ? effectiveFwdTarget?.id : undefined}
          onClose={() => setHandoffCapture(null)}
          onSent={(targetId) => {
            onRecordWorkflowLink(agent.id, targetId, "handoff");
            const target = allAgents.find((a) => a.id === targetId);
            onEvent?.({
              id: crypto.randomUUID(), ts: Date.now(), workspaceId: "",
              agentConfigId: agent.configId, agentLabel: agent.label,
              type: "manual_handoff",
              payload: {
                targetLabel: target?.label ?? targetId,
                target: target?.configId ?? targetId,
              },
            });
          }}
        />
      )}
    </div>
  );
}
