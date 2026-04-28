import { useCallback, useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { terminalBridge } from "./terminalBridge";
import {
  classifyStdoutChunk,
  createBurstTracker,
  IDLE_AFTER_MS,
  stripAnsi,
  type BurstTracker,
} from "./terminalIntelligence";
import type { AgentActivity } from "./agentActivity";
import { activityToDinoState } from "./agentActivity";
import { classifyAgentOutput } from "./agentStateAdapters";
import type { AgentKind } from "../domain/agentKind";
import { inferAgentKind } from "../domain/agentKind";
import type { DinoState } from "./dinoStateMachine";

export type TerminalLifecycleState =
  | "spawning"
  | "running"
  | "exited"
  | "killed"
  | "error";

const MAX_LOG_CHARS    = 200 * 1024; // ~200 KB cap on raw session buffer
const RECENT_OUT_MAX   = 6000;       // context window for adapter pattern matching

const HOLD_ACTIVITIES = new Set<AgentActivity>(["asking_approval", "fatal_error"]);

const XTERM_THEME = {
  background:          "#070b0e",
  foreground:          "#c8d8e8",
  cursor:              "#00c8ff",
  cursorAccent:        "#070b0e",
  selectionBackground: "#00c8ff33",
  black:               "#0d1117",
  red:                 "#f87171",
  green:               "#4ade80",
  yellow:              "#facc15",
  blue:                "#60a5fa",
  magenta:             "#c084fc",
  cyan:                "#22d3ee",
  white:               "#e2e8f0",
  brightBlack:         "#374151",
  brightRed:           "#fca5a5",
  brightGreen:         "#86efac",
  brightYellow:        "#fde68a",
  brightBlue:          "#93c5fd",
  brightMagenta:       "#d8b4fe",
  brightCyan:          "#67e8f9",
  brightWhite:         "#f8fafc",
};

interface Options {
  agentId: string;
  containerRef: React.RefObject<HTMLDivElement>;
  cwd?: string;
  launchCommand?: string;
  agentKind?: AgentKind;
}

export interface TerminalProcessHandle {
  dinoState: DinoState;
  lifecycle: TerminalLifecycleState;
  /** Derived: lifecycle === "running" */
  ready: boolean;
  copyVisible: () => Promise<void>;
  restart: () => Promise<void>;
  kill: () => Promise<void>;
  /** Returns the raw session log buffer (ANSI codes included) */
  getSessionLogs: () => string;
  /** Focuses the xterm instance */
  focusTerminal: () => void;
}

export function useTerminalProcess({
  agentId,
  containerRef,
  cwd,
  launchCommand,
  agentKind,
}: Options): TerminalProcessHandle {
  const [dinoState, setDinoState] = useState<DinoState>("idle_center");
  const [lifecycle, setLifecycle] = useState<TerminalLifecycleState>("spawning");

  const dinoStateRef         = useRef<DinoState>("idle_center");
  const termRef              = useRef<Terminal | null>(null);
  const logsRef              = useRef<string>("");
  const recentOutputRef      = useRef<string>("");
  const restartInProgressRef = useRef(false);
  const idleTimerRef         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstRef             = useRef<BurstTracker>(createBurstTracker());
  const processAliveRef      = useRef(false);

  // ── Intelligence helpers ──────────────────────────────────────────────────

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const setDino = useCallback((next: DinoState) => {
    if (dinoStateRef.current === next) return;
    dinoStateRef.current = next;
    setDinoState(next);
  }, []);

  const scheduleIdle = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      if (processAliveRef.current) setDino("idle_center");
    }, IDLE_AFTER_MS);
  }, [clearIdleTimer, setDino]);

  const resetIntelligence = useCallback(() => {
    clearIdleTimer();
    burstRef.current        = createBurstTracker();
    recentOutputRef.current = "";
    processAliveRef.current = false;
  }, [clearIdleTimer]);

  const classifyWithFallback = useCallback((
    kind: AgentKind,
    rawChunk: string,
    normalizedChunk: string,
    normalizedRecentOutput: string,
  ): { state: DinoState; hold: boolean } => {
    try {
      const activity = classifyAgentOutput(kind, {
        chunk: rawChunk,
        recentOutput: recentOutputRef.current,
        normalizedChunk,
        normalizedRecentOutput,
      });

      if (activity !== null) {
        return {
          state: activityToDinoState(activity),
          hold: HOLD_ACTIVITIES.has(activity),
        };
      }
    } catch {
      // Adapter failures must never escape the terminal event handler.
    }

    try {
      return {
        state: classifyStdoutChunk(rawChunk, burstRef.current),
        hold: false,
      };
    } catch {
      return { state: "patrol_running", hold: false };
    }
  }, []);

  // ── Stable actions ────────────────────────────────────────────────────────

  const getSessionLogs = useCallback(() => logsRef.current, []);

  const focusTerminal = useCallback(() => {
    requestAnimationFrame(() => termRef.current?.focus());
  }, []);

  const copyVisible = useCallback(async () => {
    const t = termRef.current;
    if (!t) return;
    const buf = t.buffer.active;
    const lines: string[] = [];
    for (let i = buf.viewportY; i < buf.viewportY + t.rows; i++) {
      const line = buf.getLine(i);
      if (line) lines.push(line.translateToString(true));
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      t.write("\r\n\x1b[2m[copied to clipboard]\x1b[0m\r\n");
    } catch {
      t.write("\r\n\x1b[31m[clipboard unavailable]\x1b[0m\r\n");
    }
  }, []);

  const kill = useCallback(async () => {
    clearIdleTimer();
    processAliveRef.current = false;
    await terminalBridge.kill(agentId).catch(() => {});
    setLifecycle("killed");
    setDino("terminal_dead");
  }, [agentId, clearIdleTimer, setDino]);

  const restart = useCallback(async () => {
    if (restartInProgressRef.current) return;
    restartInProgressRef.current = true;

    const t = termRef.current;
    try {
      resetIntelligence();
      await terminalBridge.kill(agentId).catch(() => {});
      logsRef.current = "";
      t?.clear();
      t?.focus();

      setLifecycle("spawning");
      setDino("idle_center");

      if (!t) throw new Error("terminal not mounted");

      const { cols, rows } = t;
      await terminalBridge.spawn(agentId, cwd ?? ".", cols, rows);

      processAliveRef.current = true;
      setLifecycle("running");
      t.focus();

      if (launchCommand?.trim()) {
        setTimeout(() => {
          terminalBridge.write(agentId, launchCommand.trim() + "\r").catch(() => {});
        }, 300);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      t?.write(`\r\n\x1b[31m[CMDino restart failed: ${msg}]\x1b[0m\r\n`);
      setLifecycle("error");
      setDino("terminal_error");
    } finally {
      restartInProgressRef.current = false;
    }
  }, [agentId, cwd, launchCommand, resetIntelligence, setDino]);

  // ── Terminal lifecycle effect ─────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    logsRef.current = "";
    resetIntelligence();
    setLifecycle("spawning");
    setDino("idle_center");
    restartInProgressRef.current = false;

    // Resolve agent kind once at mount; does not change for a given agent
    const resolvedKind: AgentKind = agentKind ?? inferAgentKind(launchCommand);

    const term = new Terminal({
      theme: XTERM_THEME,
      fontFamily: '"Cascadia Code", "JetBrains Mono", "Fira Code", "Consolas", monospace',
      fontSize: 12,
      lineHeight: 1.4,
      cursorBlink: true,
      convertEol: false,
      scrollback: 2000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    termRef.current = term;

    const unlistens = {
      data: null as null | (() => void),
      exit: null as null | (() => void),
    };
    let active = true;

    const isTauri = Boolean(
      (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
    );

    if (!isTauri) {
      requestAnimationFrame(() => {
        if (!active) return;
        fitAddon.fit();
        term.write("\x1b[33m[web preview — no PTY]\x1b[0m\r\n");
        term.write("\x1b[2mrun: npm run tauri dev\x1b[0m\r\n");
        setLifecycle("error");
        setDino("terminal_error");
      });
      return () => {
        active = false;
        termRef.current = null;
        try { term.dispose(); } catch { /* already disposed */ }
      };
    }

    const disposeResize = term.onResize(({ cols, rows }) => {
      if (!active || !processAliveRef.current) return;
      terminalBridge.resize(agentId, cols, rows).catch(() => {});
    });

    const disposeInput = term.onData((data) => {
      if (!active || !processAliveRef.current) return;
      terminalBridge.write(agentId, data).catch(() => {});
      if (data.length > 0) {
        setDino("patrol_running");
        scheduleIdle();
      }
    });

    terminalBridge
      .onData((ev) => {
        if (!active) return;
        if (ev.agent_id !== agentId) return;
        if (typeof ev.data !== "string") return;

        try {
          term.write(ev.data);
        } catch {
          return;
        }

        // Accumulate session log (bounded)
        const rawChunk = ev.data;
        const nextLog  = logsRef.current + rawChunk;
        logsRef.current = nextLog.length > MAX_LOG_CHARS
          ? nextLog.slice(nextLog.length - MAX_LOG_CHARS)
          : nextLog;

        // Accumulate recent output for adapter context
        const nextRecent = recentOutputRef.current + rawChunk;
        recentOutputRef.current = nextRecent.length > RECENT_OUT_MAX
          ? nextRecent.slice(nextRecent.length - RECENT_OUT_MAX)
          : nextRecent;

        let normalizedChunk = "";
        let normalizedRecentOutput = "";
        try {
          normalizedChunk        = stripAnsi(rawChunk);
          normalizedRecentOutput = stripAnsi(recentOutputRef.current);
        } catch {
          normalizedChunk        = rawChunk;
          normalizedRecentOutput = recentOutputRef.current;
        }

        const result = classifyWithFallback(
          resolvedKind,
          rawChunk,
          normalizedChunk,
          normalizedRecentOutput,
        );

        setDino(result.state);
        if (result.hold) {
          clearIdleTimer(); // preserve the state; don't idle out
        } else {
          scheduleIdle();
        }
      })
      .then((fn) => { if (!active) fn(); else unlistens.data = fn; })
      .catch(() => {
        if (!active) return;
        setLifecycle("error");
        setDino("terminal_error");
      });

    terminalBridge
      .onExit((ev) => {
        if (!active) return;
        if (ev.agent_id !== agentId) return;
        if (restartInProgressRef.current) return;
        clearIdleTimer();
        processAliveRef.current = false;
        const lc: TerminalLifecycleState =
          ev.reason === "killed" ? "killed"
          : ev.reason === "error"  ? "error"
          : "exited";
        setDino("terminal_dead");
        setLifecycle(lc);
        const label = ev.reason === "killed" ? "killed" : "exited";
        try {
          term.write(`\r\n\x1b[2m[process ${label}]\x1b[0m\r\n`);
        } catch {
          // Terminal may already be disposed during a webview remount.
        }
      })
      .then((fn) => { if (!active) fn(); else unlistens.exit = fn; })
      .catch(() => {
        if (!active) return;
        setLifecycle("error");
        setDino("terminal_error");
      });

    const ro = new ResizeObserver(() => {
      try { fitAddon.fit(); } catch { /* disposed */ }
    });
    ro.observe(container);

    requestAnimationFrame(() => {
      if (!active) return;
      fitAddon.fit();
      const { cols, rows } = term;
      terminalBridge
        .spawn(agentId, cwd ?? ".", cols, rows)
        .then(() => {
          if (!active) return;
          processAliveRef.current = true;
          setLifecycle("running");
          if (launchCommand?.trim()) {
            setTimeout(() => {
              if (active) {
                terminalBridge.write(agentId, launchCommand.trim() + "\r").catch(() => {});
              }
            }, 300);
          }
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          try {
            term.write(`\r\n\x1b[31m[PTY error: ${msg}]\x1b[0m\r\n`);
          } catch {
            // Terminal may already be disposed during teardown.
          }
          setLifecycle("error");
          setDino("terminal_error");
        });
    });

    return () => {
      active = false;
      clearIdleTimer();
      processAliveRef.current = false;
      try { disposeInput.dispose(); } catch { /* already disposed */ }
      try { disposeResize.dispose(); } catch { /* already disposed */ }
      try { ro.disconnect(); } catch { /* already disconnected */ }
      try { unlistens.data?.(); } catch { /* already unlistened */ }
      try { unlistens.exit?.(); } catch { /* already unlistened */ }
      termRef.current = null;
      try { term.dispose(); } catch { /* already disposed */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  return {
    dinoState,
    lifecycle,
    ready: lifecycle === "running",
    copyVisible,
    restart,
    kill,
    getSessionLogs,
    focusTerminal,
  };
}
