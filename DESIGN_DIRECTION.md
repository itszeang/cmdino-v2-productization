# CMDino Design Direction

## Product UI Concept

CMDino is an **AI Agent Mission Control** — a local-first terminal cockpit for orchestrating multi-agent coding workflows. The UI should feel like a serious developer tool that is also genuinely memorable. Think Cursor meets Warp meets a pixel-dino companion. Dense enough for power users, clear enough for anyone running agents for the first time.

---

## Visual Principles

1. **Dark-first, always high contrast.** The terminal is king. Everything else is scaffolding around it.
2. **Soft glass panels.** Surfaces feel elevated through shadow, border, and subtle depth — never through loud gradients.
3. **Semantic color.** Color carries meaning: agent identity, lifecycle state, severity. Use it consistently.
4. **Compact but breathable.** Font sizes stay small (10–13px). Padding is intentional. Nothing wastes vertical space.
5. **Premium motion.** Transitions are short (100–140ms) and purposeful. Status pulses are calm, not frantic.
6. **Dino charm.** The mascot and sprite elements are a differentiator — keep them.

---

## Layout Hierarchy

```
AppShell (100vw × 100vh)
├── AppSidebar (188px fixed)
│   ├── Brand / workspace selector
│   ├── Primary nav (New Workspace, Chat, Terminals…)
│   └── Secondary nav (History, Context, Output, Settings)
└── WorkspaceColumn (flex-1)
    ├── WorkspaceHeader (56px)
    │   ├── Identity zone (project name)
    │   ├── Active terminal label (center)
    │   └── View toggle (focus | grid)
    └── WorkspaceBody (flex-1)
        ├── AgentDock (44px, only when agents active)
        └── WorkspaceSurfaces (stacked, visibility-switched)
            ├── MainTaskChat
            ├── TerminalGrid (focus / grid)
            └── WorkflowPanel
```

---

## Color / Token System

### Base (dark theme)
| Token | Value | Purpose |
|---|---|---|
| `--app-bg` | `#111111` | Root background |
| `--surface-0` | `#171717` | Sidebar, subtle panels |
| `--surface-1` | `#1f1f1f` | Cards, modals, panels |
| `--surface-2` | `#262626` | Hover state for surface-1 |
| `--terminal-bg` | `#0f0f0f` | Terminal canvas — never change |
| `--border-subtle` | `#2a2a2a` | Default borders |
| `--border-strong` | `#3a3a3a` | Active / focused borders |
| `--text-main` | `#f5f5f5` | Primary readable text |
| `--text-muted` | `#a3a3a3` | Secondary text |
| `--text-faint` | `#737373` | Labels, captions |

### Agent Accents
| Token | Color | Agent |
|---|---|---|
| `--agent-claude` | `#f59e0b` | Claude (amber) |
| `--agent-codex` | `#22c55e` | Codex (green) |
| `--agent-gemini` | `#a78bfa` | Gemini (purple) |
| `--agent-ollama` | `#22d3ee` | Ollama (cyan) |
| `--agent-custom` | `#a3a3a3` | Custom (neutral) |

Each has a corresponding `--agent-*-dim` for backgrounds (`rgba` at 13–15% opacity).

### Status Semantic Colors
| State | Token | Color |
|---|---|---|
| ready | `--status-ready` | `#86efac` |
| running | `--status-running` | `#34d399` |
| warning | `--status-warning` | `#fbbf24` |
| error | `--status-error` | `#f87171` |
| dormant | `--status-dormant` | `#525252` |
| checkpoint | `--status-checkpoint` | `#a78bfa` |
| intervention | `--status-intervention` | `#fb923c` |

### Shadow Scale
| Token | Value |
|---|---|
| `--shadow-xs` | `0 1px 3px rgba(0,0,0,0.18)` |
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,0.24)` |
| `--shadow-md` | `0 8px 24px rgba(0,0,0,0.28)` |
| `--shadow-lg` | `0 20px 56px rgba(0,0,0,0.40)` |

### Radius Scale
| Token | Value | Use |
|---|---|---|
| `--radius-sm` | `6px` | Tags, small buttons |
| `--radius-md` | `10px` | Input fields, small cards |
| `--radius-lg` | `14px` | Modals, large panels |
| `--radius-pill` | `999px` | Pills, badges |

---

## Component Rules

### Buttons
- **Primary** (`.sidebar-cta`, `.cmd-pill-btn--primary`): Solid fill, dark text. Use `--accent` (#f5f5f5) or `--agent-claude` (#f59e0b) for emphasis.
- **Secondary** (`.cmd-pill-btn`): Border + muted text. Hover fills with `--button-bg`.
- **Ghost** (`.cmd-pill-btn--ghost`, `.cmd-icon-btn`): No border, text-faint. Hover shows subtle background.
- **Danger**: Border only at rest, filled red on hover. Never solid red at rest.
- Always `transition: 100–120ms`. Always `cursor: pointer`. Disabled = `cursor: not-allowed` + faint text.

### Cards / Panels
- Background: `var(--surface-1)`.
- Border: `1px solid var(--border-subtle)`.
- Radius: 12–14px for large panels, 8–10px for list items.
- Shadow: `var(--shadow-md)` for floating panels, none for inline cards.
- Hover: background shifts to `var(--surface-2)`, border to `var(--border-strong)`.

### Modals
- Overlay: `rgba(0,0,0,0.58)` + `backdrop-filter: blur(8px)`.
- Panel: `var(--surface-1)`, `14px` radius, `var(--shadow-lg)`.
- Header: `border-bottom: 1px solid var(--border-subtle)`, `padding: 14px 18px`.
- Footer: `border-top: 1px solid var(--border-subtle)`, `padding: 10px 18px`.

### Status Pills / Badges
- Class `.lc-pill` for lifecycle text labels (spawning, running, dormant…).
- Class `.status-badge` for standalone color badges (health chips, sidebar alerts).
- All states have semantic color from the status token set.
- **Never** use bare colored text — always pair with a bordered pill or badge container.

### Sidebar
- Background: `var(--surface-0)` — slightly elevated from `--app-bg`.
- Active row: `border-left: 2px solid var(--accent)` + `background: var(--surface-1)`.
- Section labels: 10px, 650 weight, 0.6px letter-spacing, uppercase, `--text-faint`.
- Brand area: monospace mark + product name, subtle.

### Terminal Areas
- `--terminal-bg: #0f0f0f` — never change this value.
- Pane headers use `var(--surface-1)`.
- Orch strip uses `var(--surface-0)`.
- High contrast always. No transparency over terminal canvas.

---

## What NOT to Change

1. **Terminal colors** — `--terminal-bg`, `--terminal-floor`, and xterm palette. These affect legibility of actual terminal output.
2. **TerminalGrid JSX structure** — no re-ordering or conditional wrapping. Remounting kills xterm instances.
3. **Z-index hierarchy** — 100 (modals) → 200 (logs) → 300 (artifact reader) → 9999 (toast).
4. **Accessibility attributes** — `disabled`, `aria-*`, `data-active`, `role` attributes on interactive elements.
5. **Business logic** — no changes to terminal process lifecycle, workspace state, agent orchestration.
6. **`visibility: hidden` pattern** on workspace surfaces — this is intentional to prevent remounting.
7. **Existing transition durations** — stays at 100–140ms. Don't add long animations.

---

## Phased Implementation Plan

### Phase 1 — Token foundation + Surface polish (current pass)
- [x] Add agent accent tokens (`--agent-claude` through `--agent-custom`)
- [x] Add status semantic tokens (`--status-running` through `--status-intervention`)
- [x] Add shadow scale tokens (`--shadow-xs` through `--shadow-lg`)
- [x] Add radius scale tokens
- [x] Improve sidebar: active row left accent strip, brand polish
- [x] Improve header: cleaner height, better background treatment
- [x] Improve buttons: primary visual weight, ghost clarity
- [x] Improve modals: consistent radius, better shadow
- [x] Improve status pills: semantic color modifier classes
- [x] Improve cards: consistent radius + hover depth

### Phase 2 — Agent identity integration
- [ ] Agent dock items use `--agent-*` colors for their accent lines
- [ ] Workflow nodes color-coded by agent type
- [ ] Pane headers display agent accent color strip

### Phase 3 — Animation + micro-interactions
- [ ] Spawn animation for new agent dock items
- [ ] Smooth state transitions on lc-pill color changes
- [ ] Toast/notification entrance animation
- [ ] Dino lane sync with lifecycle state color

### Phase 4 — Light theme polish
- [ ] Verify all new tokens have light theme equivalents
- [ ] Test contrast ratios in light mode
- [ ] Adjust glass-border for light surfaces

### Phase 5 — Component-level polish
- [ ] Chat composer premium feel (input glow on focus)
- [ ] Health panel status grid improvements
- [ ] Output library drawer premium card treatment
- [ ] Workflow canvas node styling with agent accents
