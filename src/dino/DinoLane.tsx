import { useEffect, useRef, useState } from "react";
import { SpriteAnimator, FRAME_PX } from "./SpriteAnimator";
import { DINO_STATE_MAP } from "../config/dinoStateMap";
import { DINO_MANIFEST } from "../config/dinoManifest";
import {
  type DinoState,
  isPatrolState,
  isCenteringState,
} from "../terminal/dinoStateMachine";

const BASE_LANE_HEIGHT = 92;
const PATROL_SPEED     = 90;  // px/sec at speed 1×
const CENTER_SPEED     = 70;  // px/sec at speed 1×
const PATROL_MIN       = 0.10;
const PATROL_MAX       = 0.90;
const STATE_COOLDOWN_MS         = 1200;
const CENTER_ARRIVE_THRESHOLD   = 0.025;

function needsCenterSequence(s: DinoState): boolean {
  return s === "success_signal" || s === "handoff_signal";
}

function getAnimDuration(dinoId: string, s: DinoState): number {
  const ref   = DINO_STATE_MAP[s];
  const entry = DINO_MANIFEST[dinoId];
  const cat   = entry?.[ref.category] as Record<string, { frames: number; fps: number }> | undefined;
  const anim  = cat?.[ref.name];
  return anim ? (anim.frames / anim.fps) * 1000 : 500;
}

type CenterPhase = "idle" | "centering" | "playing";

interface Props {
  dinoId:          string;
  state:           DinoState;
  animationSpeed?: number; // default 1
  dinoScale?:      number; // default 1
}

export function DinoLane({ dinoId, state, animationSpeed = 1, dinoScale = 1 }: Props) {
  const laneRef      = useRef<HTMLDivElement>(null);
  const spriteWrapRef = useRef<HTMLDivElement>(null);

  const xRef   = useRef(0.1);
  const dirRef = useRef<1 | -1>(1);

  const [activeState, setActiveState] = useState<DinoState>("idle_center");
  const [flipX,       setFlipX]       = useState(false);

  const [centerPhase, setCenterPhase] = useState<CenterPhase>("idle");
  const centerPhaseRef  = useRef<CenterPhase>("idle");
  const centerTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastChangeRef   = useRef(0);
  const pendingRef      = useRef<DinoState | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs current for use inside RAF without restarting the loop
  const speedRef = useRef(animationSpeed);
  const scaleRef = useRef(dinoScale);
  useEffect(() => { speedRef.current = animationSpeed; }, [animationSpeed]);
  useEffect(() => { scaleRef.current = dinoScale;      }, [dinoScale]);

  // ── External state transitions ────────────────────────────────────────────
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
    return () => { if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current); };
  }, [state]);

  // ── Center-sequence phase init ────────────────────────────────────────────
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

  // ── Movement RAF loop ─────────────────────────────────────────────────────
  useEffect(() => {
    let rafId    = 0;
    let lastTime = performance.now();

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
      const dt    = Math.min((now - lastTime) / 1000, 0.05);
      lastTime    = now;

      const lane  = laneRef.current;
      const wrap  = spriteWrapRef.current;
      if (!lane || !wrap) { rafId = requestAnimationFrame(loop); return; }

      const laneW    = lane.clientWidth;
      const displayPx = Math.round(FRAME_PX * scaleRef.current);
      const maxX     = laneW - displayPx;
      if (maxX <= 0) { rafId = requestAnimationFrame(loop); return; }

      const phase         = centerPhaseRef.current;
      const patrolSpeed   = PATROL_SPEED * speedRef.current;
      const centerSpeed   = CENTER_SPEED  * speedRef.current;

      if (needsCenterSequence(activeState) && phase === "centering") {
        const diff = 0.5 - xRef.current;
        if (Math.abs(diff) <= CENTER_ARRIVE_THRESHOLD) {
          xRef.current = 0.5;
          enterPlayPhase();
        } else {
          xRef.current += (Math.sign(diff) * centerSpeed * dt) / maxX;
          const newDir = (Math.sign(diff) as 1 | -1);
          if (newDir !== dirRef.current) {
            dirRef.current = newDir;
            setFlipX(newDir < 0);
          }
        }
      } else if (needsCenterSequence(activeState) && phase === "playing") {
        // Static while signal plays
      } else if (isPatrolState(activeState)) {
        const newFrac = xRef.current + (dirRef.current * patrolSpeed * dt) / maxX;
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
        const diff = 0.5 - xRef.current;
        if (Math.abs(diff) > 0.005) {
          xRef.current += (Math.sign(diff) * centerSpeed * dt) / maxX;
          const newDir = (Math.sign(diff) as 1 | -1);
          dirRef.current = newDir;
          setFlipX(newDir < 0);
        }
      }

      wrap.style.transform = `translateX(${Math.round(xRef.current * maxX)}px)`;
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [activeState, dinoId]);

  // ── Animation selection ───────────────────────────────────────────────────
  const stateAnimRef   = DINO_STATE_MAP[activeState];
  const displayAnimRef =
    needsCenterSequence(activeState) && centerPhase === "centering"
      ? ({ category: "base" as const, name: "move" })
      : stateAnimRef;

  const laneHeight = Math.round(BASE_LANE_HEIGHT * dinoScale);
  const displayPx  = Math.round(FRAME_PX * dinoScale);

  return (
    <div
      ref={laneRef}
      style={{
        position:        "relative",
        width:           "100%",
        height:          laneHeight,
        background:      "rgba(0,0,0,0.65)",
        backgroundImage: [
          "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,200,255,0.018) 3px, rgba(0,200,255,0.018) 4px)",
          "repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(0,200,255,0.012) 24px, rgba(0,200,255,0.012) 25px)",
        ].join(", "),
        borderTop:  "1px solid rgba(0,200,255,0.12)",
        boxShadow:  "inset 0 1px 0 rgba(0,200,255,0.06)",
        overflow:   "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          height:     1,
          background: "rgba(0,200,255,0.08)",
        }}
      />
      <div
        ref={spriteWrapRef}
        style={{
          position:    "absolute",
          bottom:      Math.round(6 * dinoScale),
          left:        0,
          width:       displayPx,
          height:      displayPx,
          willChange:  "transform",
        }}
      >
        <SpriteAnimator
          dinoId={dinoId}
          category={displayAnimRef.category}
          animName={displayAnimRef.name}
          flipX={flipX}
          animationSpeed={animationSpeed}
          displayScale={dinoScale}
        />
      </div>
    </div>
  );
}
