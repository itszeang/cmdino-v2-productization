import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { terminalBridge } from "./terminalBridge";
import { parseStdoutVibe } from "./stdoutVibeParser";
import type { DinoState } from "./dinoStateMachine";

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
}

export interface TerminalProcessHandle {
  dinoState: DinoState;
  ready: boolean;
}

export function useTerminalProcess({
  agentId,
  containerRef,
  cwd,
  launchCommand,
}: Options): TerminalProcessHandle {
  const [dinoState, setDinoState] = useState<DinoState>("idle_center");
  const [ready, setReady] = useState(false);

  const dinoStateRef = useRef<DinoState>("idle_center");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      theme: XTERM_THEME,
      fontFamily:
        '"Cascadia Code", "JetBrains Mono", "Fira Code", "Consolas", monospace',
      fontSize: 12,
      lineHeight: 1.4,
      cursorBlink: true,
      convertEol: false,
      scrollback: 2000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);

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
      });
      return () => {
        active = false;
        term.dispose();
      };
    }

    const disposeResize = term.onResize(({ cols, rows }) => {
      terminalBridge.resize(agentId, cols, rows).catch(() => {});
    });

    const disposeInput = term.onData((data) => {
      terminalBridge.write(agentId, data).catch(() => {});
    });

    terminalBridge
      .onData((ev) => {
        if (ev.agent_id !== agentId) return;
        term.write(ev.data);
        const parsed = parseStdoutVibe(ev.data);
        if (parsed && parsed !== dinoStateRef.current) {
          dinoStateRef.current = parsed;
          setDinoState(parsed);
        }
      })
      .then((fn) => {
        if (!active) fn();
        else unlistens.data = fn;
      });

    terminalBridge
      .onExit((ev) => {
        if (ev.agent_id !== agentId) return;
        dinoStateRef.current = "terminal_dead";
        setDinoState("terminal_dead");
        term.write("\r\n\x1b[2m[process exited]\x1b[0m\r\n");
        setReady(false);
      })
      .then((fn) => {
        if (!active) fn();
        else unlistens.exit = fn;
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
          setReady(true);
          // Write launch command after shell initialises
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
          term.write(`\r\n\x1b[31m[PTY error: ${msg}]\x1b[0m\r\n`);
        });
    });

    return () => {
      active = false;
      disposeInput.dispose();
      disposeResize.dispose();
      ro.disconnect();
      unlistens.data?.();
      unlistens.exit?.();
      terminalBridge.kill(agentId).catch(() => {});
      term.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  return { dinoState, ready };
}
