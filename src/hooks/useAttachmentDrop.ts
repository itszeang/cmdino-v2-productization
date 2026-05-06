import { useEffect, useRef } from "react";
import { attachmentKindFromPath } from "../domain/orchestration";

const isTauri = Boolean(
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
);

interface UseAttachmentDropOptions {
  paneRefs:      { current: Map<string, HTMLElement> };
  activeAgentId: string | null;
  onDrop:        (agentId: string, paths: string[]) => void;
  onSkipped?:    (count: number, agentId: string) => void;
}

export function useAttachmentDrop({
  paneRefs,
  activeAgentId,
  onDrop,
  onSkipped,
}: UseAttachmentDropOptions) {
  const onDropRef    = useRef(onDrop);
  const onSkipRef    = useRef(onSkipped);
  const activeIdRef  = useRef(activeAgentId);

  useEffect(() => { onDropRef.current  = onDrop;       }, [onDrop]);
  useEffect(() => { onSkipRef.current  = onSkipped;    }, [onSkipped]);
  useEffect(() => { activeIdRef.current = activeAgentId; }, [activeAgentId]);

  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | undefined;

    async function register() {
      try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        unlisten = await getCurrentWebview().onDragDropEvent((event) => {
          if (event.payload.type !== "drop") return;

          const payload = event.payload as unknown as {
            paths: string[];
            position?: { x: number; y: number };
          };

          const allPaths = payload.paths ?? [];

          // Separate valid from invalid — folders have no recognised extension.
          const valid   = allPaths.filter((p) => attachmentKindFromPath(p));
          const skipped = allPaths.length - valid.length;

          if (valid.length === 0) {
            if (skipped > 0) {
              console.warn(`[drop] ${skipped} file(s) ignored — only .md and .txt are supported.`);
            }
            return;
          }

          // ── Hit-test ─────────────────────────────────────────────────────
          // Tauri DragDropEvent.position is PhysicalPosition (physical pixels).
          // getBoundingClientRect() returns logical CSS pixels.
          // Convert physical → logical by dividing by devicePixelRatio.
          let targetId: string | null = null;

          if (payload.position) {
            const dpr      = window.devicePixelRatio || 1;
            const logicalX = payload.position.x / dpr;
            const logicalY = payload.position.y / dpr;

            for (const [agentId, el] of paneRefs.current.entries()) {
              const r = el.getBoundingClientRect();
              // Skip hidden / zero-size panes (focus mode hides inactive panes).
              if (r.width === 0 || r.height === 0) continue;
              if (
                logicalX >= r.left && logicalX <= r.right &&
                logicalY >= r.top  && logicalY <= r.bottom
              ) {
                targetId = agentId;
                break;
              }
            }

            if (!targetId) {
              console.warn(
                `[drop] No pane matched logical (${logicalX.toFixed(1)}, ${logicalY.toFixed(1)})`,
                `[dpr=${dpr}] physical=(${payload.position.x}, ${payload.position.y})`,
                `— falling back to active terminal.`,
              );
            }
          }

          // Fallback: active terminal, not first agent.
          const finalId = targetId ?? activeIdRef.current;
          if (!finalId) {
            console.warn("[drop] No target resolved and no active terminal — drop ignored.");
            return;
          }

          onDropRef.current(finalId, valid);

          if (skipped > 0) {
            onSkipRef.current?.(skipped, finalId);
            console.warn(`[drop] ${skipped} file(s) ignored (unsupported extension).`);
          }
        });
      } catch {
        // webview API unavailable in non-Tauri builds
      }
    }

    void register();
    return () => { unlisten?.(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
