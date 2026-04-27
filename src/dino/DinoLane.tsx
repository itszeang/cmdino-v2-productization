import { useEffect, useRef, useState } from "react";
import { SpriteAnimator, FRAME_PX } from "./SpriteAnimator";
import { DINO_STATE_MAP } from "../config/dinoStateMap";
import { DINO_MANIFEST } from "../config/dinoManifest";
import {
  type DinoState,
  isPatrolState,
  isCenteringState,
} from "../terminal/dinoStateMachine";

const LANE_HEIGHT = 92;
const PATROL_SPEED = 90;      // px/sec
const CENTER_SPEED = 70;      // px/sec
const PATROL_MIN = 0.10;
const PATROL_MAX = 0.90;
const STATE_COOLDOWN_MS = 1200;
const CENTER_ARRIVE_THRESHOLD = 0.025; // fraction — "close enough" to 0.5

// States that require walk-to-center → play signal → idle sequence
function needsCenterSequence(s: DinoState): boolean {
  return s === "success_signal" || s === "handoff_signal";
}

// Compute full animation playback duration from manifest (ms)
function getAnimDuration(dinoId: string, s: DinoState): number {
  const ref = DINO_STATE_MAP[s];
  const entry = DINO_MANIFEST[dinoId];
  const cat = entry?.[ref.category] as
    | Record<string, { frames: number; fps: number }>
    | undefined;
  const anim = cat?.[ref.name];
  return anim ? (anim.frames / anim.fps) * 1000 : 500;
}

// Phase within a center-sequence state
type CenterPhase = "idle" | "centering" | "playing";

interface Props {
  dinoId: string;
  state: DinoState;
}

export function DinoLane({ dinoId, state }: Props) {
  const laneRef = useRef<HTMLDivElement>(null);
  const spriteWrapRef = useRef<HTMLDivElement>(null);

  const xRef = useRef(0.1);
  const dirRef = useRef<1 | -1>(1);

  const [activeState, setActiveState] = useState<DinoState>("idle_center");
  const [flipX, setFlipX] = useState(false);

  // centerPhase drives which animation is shown; ref allows RAF reads without re-render
  const [centerPhase, setCenterPhase] = useState<CenterPhase>("idle");
  const centerPhaseRef = useRef<CenterPhase>("idle");
  const centerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastChangeRef = useRef(0);
  const pendingRef = useRef<DinoState | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── External state transitions (1200ms cooldown, dead = immediate) ──────────
  useEffect(() => {
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }

    if (state === "terminal_dead") {
      setActiveState(state);
      lastChangeRef.current = Date.now();
      return;
    }

    const elapsed = Date.now() - lastChangeRef.current;
    if (elapsed >= STATE_COOLDOWN_MS) {
      setActiveState(state);
      lastChangeRef.current = Date.now();
    } else {
      pendingRef.current = state;
      pendingTimerRef.current = setTimeout(() => {
        if (pendingRef.current !== null) {
          setActiveState(pendingRef.current);
          lastChangeRef.current = Date.now();
          pendingRef.current = null;
        }
      }, STATE_COOLDOWN_MS - elapsed);
    }

    return () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    };
  }, [state]);

  // ── Initialize center-sequence phase when activeState changes ───────────────
  // Runs BEFORE the movement loop effect so centerPhaseRef is correct on first tick.
  useEffect(() => {
    if (centerTimerRef.current) {
      clearTimeout(centerTimerRef.current);
      centerTimerRef.current = null;
    }

    if (needsCenterSequence(activeState)) {
      centerPhaseRef.current = "centering";
      setCenterPhase("centering");
    } else {
      centerPhaseRef.current = "idle";
      setCenterPhase("idle");
    }
  }, [activeState]);

  // ── Movement game loop ───────────────────────────────────────────────────────
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    // Called once the dino arrives at center — starts the signal animation
    const enterPlayPhase = () => {
      centerPhaseRef.current = "playing";
      setCenterPhase("playing");

      const duration = getAnimDuration(dinoId, activeState);
      centerTimerRef.current = setTimeout(() => {
        centerPhaseRef.current = "idle";
        setCenterPhase("idle");
        setActiveState("idle_center");
        lastChangeRef.current = Date.now();
      }, duration);
    };

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const lane = laneRef.current;
      const wrap = spriteWrapRef.current;
      if (!lane || !wrap) { rafId = requestAnimationFrame(loop); return; }

      const laneW = lane.clientWidth;
      const maxX = laneW - FRAME_PX;
      if (maxX <= 0) { rafId = requestAnimationFrame(loop); return; }

      const phase = centerPhaseRef.current;

      if (needsCenterSequence(activeState) && phase === "centering") {
        // Walk toward center, switch to play phase on arrival
        const diff = 0.5 - xRef.current;
        if (Math.abs(diff) <= CENTER_ARRIVE_THRESHOLD) {
          xRef.current = 0.5;
          enterPlayPhase();
        } else {
          xRef.current += (Math.sign(diff) * CENTER_SPEED * dt) / maxX;
          const newDir = (Math.sign(diff) as 1 | -1);
          if (newDir !== dirRef.current) {
            dirRef.current = newDir;
            setFlipX(newDir < 0);
          }
        }
      } else if (needsCenterSequence(activeState) && phase === "playing") {
        // Static while signal animation plays — no movement
      } else if (isPatrolState(activeState)) {
        const newFrac = xRef.current + (dirRef.current * PATROL_SPEED * dt) / maxX;
        if (newFrac >= PATROL_MAX) {
          xRef.current = PATROL_MAX;
          dirRef.current = -1;
          setFlipX(true);
        } else if (newFrac <= PATROL_MIN) {
          xRef.current = PATROL_MIN;
          dirRef.current = 1;
          setFlipX(false);
        } else {
          xRef.current = newFrac;
        }
      } else if (isCenteringState(activeState)) {
        // idle_center: walk to center, stay
        const diff = 0.5 - xRef.current;
        if (Math.abs(diff) > 0.005) {
          xRef.current += (Math.sign(diff) * CENTER_SPEED * dt) / maxX;
          const newDir = (Math.sign(diff) as 1 | -1);
          dirRef.current = newDir;
          setFlipX(newDir < 0);
        }
      }
      // static damage states (hurt, dead, scan): no movement

      wrap.style.transform = `translateX(${Math.round(xRef.current * maxX)}px)`;
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [activeState, dinoId]);

  // ── Animation selection ──────────────────────────────────────────────────────
  // During centering phase: show move animation (walking to center)
  // During playing phase / all other states: show the mapped state animation
  const stateAnimRef = DINO_STATE_MAP[activeState];
  const displayAnimRef =
    needsCenterSequence(activeState) && centerPhase === "centering"
      ? ({ category: "base" as const, name: "move" })
      : stateAnimRef;

  return (
    <div
      ref={laneRef}
      style={{
        position: "relative",
        width: "100%",
        height: LANE_HEIGHT,
        background: "rgba(0,0,0,0.65)",
        backgroundImage: [
          "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,200,255,0.018) 3px, rgba(0,200,255,0.018) 4px)",
          "repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(0,200,255,0.012) 24px, rgba(0,200,255,0.012) 25px)",
        ].join(", "),
        borderTop: "1px solid rgba(0,200,255,0.12)",
        boxShadow: "inset 0 1px 0 rgba(0,200,255,0.06)",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          background: "rgba(0, 200, 255, 0.08)",
        }}
      />
      <div
        ref={spriteWrapRef}
        style={{
          position: "absolute",
          bottom: 6,
          left: 0,
          width: FRAME_PX,
          height: FRAME_PX,
          willChange: "transform",
        }}
      >
        <SpriteAnimator
          dinoId={dinoId}
          category={displayAnimRef.category}
          animName={displayAnimRef.name}
          flipX={flipX}
        />
      </div>
    </div>
  );
}
