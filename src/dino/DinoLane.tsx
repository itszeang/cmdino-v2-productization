import { useEffect, useRef, useState } from "react";
import { SpriteAnimator, FRAME_PX } from "./SpriteAnimator";
import { DINO_STATE_MAP } from "../config/dinoStateMap";
import {
  type DinoState,
  isPatrolState,
  isCenteringState,
} from "../terminal/dinoStateMachine";

const LANE_HEIGHT = 92;
const PATROL_SPEED = 90;     // px/sec
const CENTER_SPEED = 70;     // px/sec
const PATROL_MIN = 0.10;
const PATROL_MAX = 0.90;
const STATE_COOLDOWN_MS = 1200;

interface Props {
  dinoId: string;
  state: DinoState;
}

export function DinoLane({ dinoId, state }: Props) {
  const laneRef = useRef<HTMLDivElement>(null);
  const spriteWrapRef = useRef<HTMLDivElement>(null);

  // x position as fraction [0,1] of (laneWidth - FRAME_PX)
  const xRef = useRef(0.1);
  const dirRef = useRef(1); // 1 = right, -1 = left

  const [activeState, setActiveState] = useState<DinoState>("idle_center");
  const [flipX, setFlipX] = useState(false);

  const lastChangeRef = useRef(0);
  const pendingRef = useRef<DinoState | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // State transition with 1200ms cooldown (immediate for terminal_dead)
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

  // Movement game loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const lane = laneRef.current;
      const wrap = spriteWrapRef.current;
      if (!lane || !wrap) {
        rafId = requestAnimationFrame(loop);
        return;
      }

      const laneW = lane.clientWidth;
      const maxX = laneW - FRAME_PX;
      if (maxX <= 0) {
        rafId = requestAnimationFrame(loop);
        return;
      }

      if (isPatrolState(activeState)) {
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
        const target = 0.5;
        const diff = target - xRef.current;
        if (Math.abs(diff) > 0.005) {
          const step = (Math.sign(diff) * CENTER_SPEED * dt) / maxX;
          xRef.current = xRef.current + step;
          const newDir = Math.sign(diff) as 1 | -1;
          dirRef.current = newDir;
          setFlipX(newDir < 0);
        }
      }
      // static states: no movement

      wrap.style.transform = `translateX(${Math.round(xRef.current * maxX)}px)`;
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [activeState]);

  const animRef = DINO_STATE_MAP[activeState];

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
      {/* Ground line */}
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
          category={animRef.category}
          animName={animRef.name}
          flipX={flipX}
        />
      </div>
    </div>
  );
}
