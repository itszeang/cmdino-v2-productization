import { useEffect, useRef } from "react";
import { loadAsset } from "./assetLoader";
import { DINO_MANIFEST } from "../config/dinoManifest";

const SPRITE_HEIGHT = 24;
const SCALE = 4;
export const FRAME_PX = SPRITE_HEIGHT * SCALE; // 96px — all frames are square at 4×

interface Props {
  dinoId:         string;
  category:       "base" | "egg" | "ghost";
  animName:       string;
  flipX?:         boolean;
  animationSpeed?: number; // multiplier on fps, default 1
  displayScale?:  number;  // CSS size multiplier, default 1
}

export function SpriteAnimator({
  dinoId, category, animName, flipX = false,
  animationSpeed = 1, displayScale = 1,
}: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const rafRef      = useRef(0);
  const speedRef    = useRef(animationSpeed);

  // Keep speed ref current without restarting the draw loop
  useEffect(() => { speedRef.current = animationSpeed; }, [animationSpeed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = FRAME_PX;
    canvas.height = FRAME_PX;
    ctx.clearRect(0, 0, FRAME_PX, FRAME_PX);

    const dinoEntry  = DINO_MANIFEST[dinoId];
    const catEntry   = dinoEntry?.[category] as Record<string, { frames: number; fps: number; loop: boolean }> | undefined;
    const animConfig = catEntry?.[animName];
    if (!animConfig) return;

    const { frames, fps, loop } = animConfig;

    let frameIndex    = 0;
    let lastFrameTime = 0;
    let image: HTMLImageElement | null = null;
    let cancelled     = false;

    loadAsset(dinoId, category, animName).then((img) => {
      if (!cancelled) image = img;
    });

    const draw = (now: number) => {
      if (cancelled) return;

      if (image) {
        const frameW         = image.width / frames;
        const effectiveFps   = fps * speedRef.current;
        const frameInterval  = 1000 / Math.max(effectiveFps, 0.1);

        if (now - lastFrameTime >= frameInterval) {
          if (loop) {
            frameIndex = (frameIndex + 1) % frames;
          } else {
            frameIndex = Math.min(frameIndex + 1, frames - 1);
          }
          lastFrameTime = now;
        }

        ctx.clearRect(0, 0, FRAME_PX, FRAME_PX);

        if (flipX) {
          ctx.save();
          ctx.scale(-1, 1);
          ctx.translate(-FRAME_PX, 0);
        }

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          image,
          frameIndex * frameW, 0, frameW, SPRITE_HEIGHT,
          0, 0, FRAME_PX, FRAME_PX,
        );

        if (flipX) ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [dinoId, category, animName, flipX]);

  const displayPx = Math.round(FRAME_PX * displayScale);

  return (
    <canvas
      ref={canvasRef}
      width={FRAME_PX}
      height={FRAME_PX}
      style={{
        imageRendering: "pixelated",
        width:          displayPx,
        height:         displayPx,
        display:        "block",
      }}
    />
  );
}
