# CMDino — Dino Asset Integration Specification
Version: 1.0
Status: Binding Technical Spec

---

## 1. Purpose

The dinosaur assets are not decorative visuals.

Inside CMDino, each dinosaur acts as:

- a live terminal state indicator
- an AI agent identity marker
- a motion-based UX feedback system

Every terminal pane hosts one dinosaur that visually reflects the current process state.

This specification defines the mandatory folder structure, animation mapping, runtime parsing rules, lane movement behavior, and implementation constraints.

All engineering agents must follow this spec.

---

## 2. Asset Source

Asset Pack Used:
DemChing Dino Family

Local Project Asset Root:
assets/

The asset pack contains multiple dinosaur characters, each split into:

- base animations
- egg animations
- ghost animations

Each animation is stored as a horizontal sprite strip PNG.

Example:
assets/female/cole/base/move.png

---

## 3. Mandatory Asset Directory Structure

The project must preserve the original pack hierarchy.

\`\`\`
assets/
 ├── female/
 │    ├── cole/
 │    │    ├── base/
 │    │    ├── egg/
 │    │    └── ghost/
 │    ├── ...
 │
 └── male/
      ├── ...
\`\`\`

Each dinosaur character folder is treated as one selectable CMDino dinosaur identity.

Internal Dino ID format:

\`\`\`
gender-characterName
\`\`\`

Examples:

- female-cole
- male-rex

---

## 4. Animation Category Structure

### 4.1 Base Animations

Located in:

\`\`\`
assets/{gender}/{character}/base/
\`\`\`

Required files:

- avoid.png
- bite.png
- dash.png
- dead.png
- hurt.png
- idle.png
- jump.png
- kick.png
- move.png
- scan.png

These represent normal terminal process states.

---

### 4.2 Egg Animations

Located in:

\`\`\`
assets/{gender}/{character}/egg/
\`\`\`

Required files:

- crack.png
- hatch.png
- move.png

These represent terminal creation / spawn transitions.

---

### 4.3 Ghost Animations

Located in:

\`\`\`
assets/{gender}/{character}/ghost/
\`\`\`

Required files:

- idle.png
- move.png

These represent disconnected, detached, or suspended sessions.

---

## 5. Sprite Strip Parsing Rule

Every PNG file is a horizontal sprite strip.

Frames are not stored as separate PNG files.

Runtime engine must:

1. load the PNG
2. read total image width
3. divide by known frame count
4. crop frames dynamically

Formula:

\`\`\`
frameWidth = image.width / frameCount
frameHeight = image.height
\`\`\`

No manual sprite slicing files should be created.

---

## 6. Dino Manifest Requirement

A centralized manifest file is mandatory.

Suggested file:

\`\`\`
src/config/dinoManifest.ts
\`\`\`

This file must contain:

- all selectable dinosaur IDs
- all animation names
- frame counts
- recommended fps
- loop settings

Example structure:

\`\`\`ts
export const DINO_MANIFEST = {
  "female-cole": {
    base: {
      idle: { frames: 3, fps: 7, loop: true },
      move: { frames: 4, fps: 10, loop: true },
      dash: { frames: 5, fps: 14, loop: true },
      scan: { frames: 5, fps: 8, loop: true },
      avoid: { frames: 3, fps: 10, loop: false },
      hurt: { frames: 4, fps: 8, loop: false },
      dead: { frames: 5, fps: 5, loop: false },
      jump: { frames: 4, fps: 10, loop: false },
      bite: { frames: 3, fps: 9, loop: false },
      kick: { frames: 3, fps: 9, loop: false }
    },
    egg: {
      crack: { frames: 4, fps: 8, loop: false },
      hatch: { frames: 4, fps: 8, loop: false },
      move: { frames: 4, fps: 8, loop: false }
    },
    ghost: {
      idle: { frames: 3, fps: 6, loop: true },
      move: { frames: 4, fps: 8, loop: true }
    }
  }
}
\`\`\`

---

## 7. CMDino Internal State → Animation Mapping

| CMDino Internal State | Asset File |
|-----------------------|------------|
| idle_center | base/idle.png |
| patrol_running | base/move.png |
| heavy_processing | base/dash.png |
| review_scan | base/scan.png |
| warning_avoid | base/avoid.png |
| success_signal | base/jump.png or base/bite.png |
| handoff_signal | base/kick.png |
| terminal_error | base/hurt.png |
| terminal_dead | base/dead.png |
| spawn_crack | egg/crack.png |
| spawn_hatch | egg/hatch.png |
| spawn_move | egg/move.png |
| disconnected_idle | ghost/idle.png |
| disconnected_move | ghost/move.png |

This mapping is mandatory and should not be changed casually.

---

## 8. Dino Lane Rendering Model

Each terminal pane must contain a dedicated visual strip called:

Dino Lane

Structure:

\`\`\`
TerminalPane
 ├── Terminal Output Region
 └── Dino Lane Overlay
\`\`\`

Dino Lane Rules:

- full terminal width
- fixed height between 64px and 72px
- dark transparent background
- isolated from terminal text rendering

Dinosaurs must only move inside this lane.

Dinosaurs must never overlap terminal text content.

---

## 9. Movement Behavior Rules

Each dinosaur has:

- x position
- movement direction
- active animation state

### 9.1 Patrol States

States:
- patrol_running
- heavy_processing
- disconnected_move

Behavior:
- move continuously between 10% and 90% lane width
- reverse direction on bounds

---

### 9.2 Centering States

States:
- idle_center
- success_signal
- handoff_signal

Behavior:
- walk toward lane center
- once centered, trigger assigned animation

---

### 9.3 Static Damage States

States:
- terminal_error
- terminal_dead
- review_scan

Behavior:
- stay in current x position
- animate in place

---

## 10. State Transition Cooldown

To avoid visual flickering, animation state changes must have:

minimum cooldown = 1200ms

unless process is terminated.

---

## 11. Terminal Parser Trigger Mapping

Initial MVP may use regex based parsing.

### Running Triggers

- running
- executing
- editing
- writing
- building
- installing

→ patrol_running

---

### Heavy Triggers

- thinking
- analyzing
- processing
- searching

→ heavy_processing or review_scan

---

### Success Triggers

- done
- completed
- success
- finished

→ success_signal

---

### Error Triggers

- error
- failed
- exception
- traceback

→ terminal_error

---

### Process Closed

→ terminal_dead

---

## 12. Engineering Constraints

Mandatory implementation constraints:

- use one shared SpriteAnimator component
- use one centralized manifest
- no gif usage
- no manually pre-sliced frame png generation
- all dinosaurs must use the same runtime engine
- lane logic must be independent per terminal

---

## 13. Design Philosophy

CMDino dinosaurs are living process indicators, not decorative mascots.

All implementation decisions must prioritize:

- readability
- terminal state clarity
- lightweight rendering
- consistent motion language