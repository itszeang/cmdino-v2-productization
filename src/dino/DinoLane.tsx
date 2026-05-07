import { useEffect, useRef, useState } from "react";
import { SpriteAnimator, FRAME_PX } from "./SpriteAnimator";
import { DINO_STATE_MAP } from "../config/dinoStateMap";
import { DINO_MANIFEST } from "../config/dinoManifest";
import {
  type DinoState,
  isPatrolState,
  isCenteringState,
  isEggState,
} from "../terminal/dinoStateMachine";

const FLOOR_BREATHING_PX = 24;
const PATROL_SPEED     = 90;  // px/sec at speed 1×
const CENTER_SPEED     = 70;  // px/sec at speed 1×
const PATROL_MIN       = 0.10;
const PATROL_MAX       = 0.90;
const STATE_COOLDOWN_MS         = 1200;
const CENTER_ARRIVE_THRESHOLD   = 0.025;

export type DinoVisualPhase = "egg_idle" | "egg_hatching" | "dino";
type EggHatchAnim = "crack" | "hatch";

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
  visualPhase?:    DinoVisualPhase;
  onEggHatchComplete?: () => void;
}

export function DinoLane({
  dinoId,
  state,
  animationSpeed = 1,
  dinoScale = 1,
  visualPhase = "dino",
  onEggHatchComplete,
}: Props) {
  const laneRef      = useRef<HTMLDivElement>(null);
  const spriteWrapRef = useRef<HTMLDivElement>(null);

  const xRef   = useRef(0.1);
  const dirRef = useRef<1 | -1>(1);

  const [activeState, setActiveState] = useState<DinoState>("idle_center");
  const [flipX,       setFlipX]       = useState(false);
  const [eggAnim,     setEggAnim]     = useState<EggHatchAnim>("crack");

  const [centerPhase, setCenterPhase] = useState<CenterPhase>("idle");
  const centerPhaseRef  = useRef<CenterPhase>("idle");
  const centerTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eggTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastChangeRef   = useRef(0);
  const pendingRef      = useRef<DinoState | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs current for use inside RAF without restarting the loop
  const speedRef = useRef(animationSpeed);
  const scaleRef = useRef(dinoScale);
  const visualPhaseRef = useRef<DinoVisualPhase>(visualPhase);
  useEffect(() => { speedRef.current = animationSpeed; }, [animationSpeed]);
  useEffect(() => { scaleRef.current = dinoScale;      }, [dinoScale]);
  useEffect(() => { visualPhaseRef.current = visualPhase; }, [visualPhase]);

  useEffect(() => {
    if (eggTimerRef.current) {
      clearTimeout(eggTimerRef.current);
      eggTimerRef.current = null;
    }

    if (visualPhase === "egg_idle") {
      setEggAnim("crack");
      setFlipX(false);
      return;
    }

    if (visualPhase !== "egg_hatching") return;

    setEggAnim("crack");
    setFlipX(false);

    const crackMs = getAnimDuration(dinoId, "spawn_crack");
    const hatchMs = getAnimDuration(dinoId, "spawn_hatch");

    eggTimerRef.current = setTimeout(() => {
      setEggAnim("hatch");
      eggTimerRef.current = setTimeout(() => {
        onEggHatchComplete?.();
      }, hatchMs);
    }, crackMs);

    return () => {
      if (eggTimerRef.current) clearTimeout(eggTimerRef.current);
    };
  }, [dinoId, onEggHatchComplete, visualPhase]);

  // ── External state transitions ────────────────────────────────────────────
  useEffect(() => {
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    if (state === "terminal_dead" || isEggState(state)) {
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

      if (visualPhaseRef.current !== "dino") {
        xRef.current = 0.5;
        wrap.style.transform = `translateX(${Math.round(maxX / 2)}px)`;
        rafId = requestAnimationFrame(loop);
        return;
      }

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
      } else if (isEggState(activeState)) {
        // Egg sits centered on the floor — drift there quietly.
        const diff = 0.5 - xRef.current;
        if (Math.abs(diff) > 0.005) {
          xRef.current += (Math.sign(diff) * centerSpeed * dt) / maxX;
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
  const isEggPhase = visualPhase !== "dino";

  const displayPx  = Math.round(FRAME_PX * dinoScale);
  const laneHeight = displayPx + Math.round(FLOOR_BREATHING_PX * dinoScale);
  const spriteBottom = Math.round(8 * dinoScale);

  return (
    <div
      ref={laneRef}
      className="dino-lane"
      data-phase={visualPhase}
      data-state={state}
      style={{
        height:    laneHeight,
        paddingTop: Math.round(10 * dinoScale),
      }}
    >
      <div
        ref={spriteWrapRef}
        style={{
          position:    "absolute",
          bottom:      spriteBottom,
          left:        0,
          width:       displayPx,
          height:      displayPx,
          willChange:  "transform",
          overflow:    "visible",
        }}
      >
        <SpriteAnimator
          dinoId={dinoId}
          category={isEggPhase ? "egg" : displayAnimRef.category}
          animName={isEggPhase ? eggAnim : displayAnimRef.name}
          flipX={isEggPhase ? false : flipX}
          animationSpeed={animationSpeed}
          displayScale={dinoScale}
          freezeFrame={visualPhase === "egg_idle" ? 0 : undefined}
        />
      </div>
    </div>
  );
}
