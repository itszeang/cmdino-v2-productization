export type AnimConfig = {
  frames: number;
  fps: number;
  loop: boolean;
};

export type BaseAnims = {
  idle: AnimConfig;
  move: AnimConfig;
  dash: AnimConfig;
  scan: AnimConfig;
  avoid: AnimConfig;
  hurt: AnimConfig;
  dead: AnimConfig;
  jump: AnimConfig;
  bite: AnimConfig;
  kick: AnimConfig;
};

export type EggAnims = {
  crack: AnimConfig;
  hatch: AnimConfig;
  move: AnimConfig;
};

export type GhostAnims = {
  idle: AnimConfig;
  move: AnimConfig;
};

export type DinoEntry = {
  base: BaseAnims;
  egg: EggAnims;
  ghost: GhostAnims;
};

export const DINO_MANIFEST: Record<string, DinoEntry> = {
  "female-cole": {
    base: {
      idle:  { frames: 3, fps: 7,  loop: true  },
      move:  { frames: 6, fps: 12, loop: true  },
      dash:  { frames: 6, fps: 16, loop: true  },
      scan:  { frames: 6, fps: 8,  loop: true  },
      avoid: { frames: 3, fps: 10, loop: false },
      hurt:  { frames: 4, fps: 8,  loop: false },
      dead:  { frames: 5, fps: 5,  loop: false },
      jump:  { frames: 4, fps: 10, loop: false },
      bite:  { frames: 3, fps: 9,  loop: false },
      kick:  { frames: 3, fps: 9,  loop: false },
    },
    egg: {
      crack: { frames: 4, fps: 8, loop: false },
      hatch: { frames: 4, fps: 8, loop: false },
      move:  { frames: 4, fps: 8, loop: false },
    },
    ghost: {
      idle: { frames: 3, fps: 6, loop: true },
      move: { frames: 4, fps: 8, loop: true },
    },
  },
};
