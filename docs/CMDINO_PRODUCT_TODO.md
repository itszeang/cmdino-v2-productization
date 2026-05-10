# CMDino Product Todo / Roadmap

## Purpose

This file tracks CMDino's path from the current working alpha to a closed alpha and, later, a sellable product. Use it as the project-wide source of truth before starting new Codex work, especially while P0 closed-alpha tasks remain.

## Status Legend

- ✅ Done
- 🟡 Partial / needs polish
- ❌ Not started
- 🔴 Critical before closed alpha
- 🟣 Future / optional

## Current Product State

CMDino already has a multi-agent terminal workspace, Agent Dock, workflow map, context system, health/readiness checks, runtime error cards, Output Shelf, session continuity, workspace/output deletion, packaged Windows builds, and product trust docs. The app is a working Windows-first alpha, but closed-alpha readiness still depends on clean-machine QA, release identity, dogfood proof, and final alpha packaging.

## Master Feature Matrix

### 0. Core Product Foundation

| Feature/System | Status | Notes | Priority |
| --- | --- | --- | --- |
| Multi-agent terminal workspace | ✅ Done | Core pane/grid/focus workflow exists. | P0 |
| Tauri desktop shell | ✅ Done | Windows-first Tauri v2 build is working. | P0 |
| Custom command agents | ✅ Done | Custom agents can launch local commands with readiness validation. | P0 |
| Preset agents | 🟡 Partial / needs polish | Presets exist; installer/clean-machine UX still needs validation. | P0 |
| Packaged Windows builds | ✅ Done | EXE, MSI, and NSIS artifacts produced in QA pass. | P0 |
| Clean-machine installer validation | ❌ Not started | Current next P0 task; run `docs/CLEAN_MACHINE_QA.md` outside the dev machine. | P0 |

### 1. Workflow / Orchestration Layer

| Feature/System | Status | Notes | Priority |
| --- | --- | --- | --- |
| Workflow map | ✅ Done | Visual route/handoff graph exists. | P1 |
| Manual Review & Send | ✅ Done | User-reviewed handoff flow exists. | P0 |
| Send Latest | ✅ Done | Sends recent clean output to a target agent when available. | P1 |
| Workflow route preference | ✅ Done | Routes are visual/manual preferences, not automation. | P1 |
| Autonomous execution | 🟣 Future / optional | Explicitly out of V1 alpha scope. | P3 |

### 2. Context / Attachment System

| Feature/System | Status | Notes | Priority |
| --- | --- | --- | --- |
| Local file path attachments | ✅ Done | `.md` and `.txt` path input exists. | P0 |
| Generated output attachments | ✅ Done | Output Shelf files can attach to agents. | P0 |
| Preset/starter context | ✅ Done | Preset brains are supported through `cmdino-preset://` paths. | P0 |
| Preview / send / remove / copy path | ✅ Done | Existing behavior works and must not regress. | P0 |
| Drag/drop attachments | ✅ Done | QA source pass verifies pane hit testing and `.md`/`.txt` filtering. | P1 |
| Add Context V2 guided UX | 🟡 Partial / needs polish | Current feature works but remains dense and technical. | P0 |
| Artifact Reader polish | 🟡 Partial / needs polish | Reader works; attached state and long-preview workflows need refinement. | P1 |
| Stale deleted attachment references | 🟡 Partial / needs polish | Fails gracefully, but UX should be clearer. | P1 |

### 3. Persistence / Continuity

| Feature/System | Status | Notes | Priority |
| --- | --- | --- | --- |
| Save/open workspace | ✅ Done | Local workspace persistence exists. | P0 |
| Delete workspace | ✅ Done | Delete flow exists and clears matching continuation record. | P0 |
| Session continuity panel | ✅ Done | Last session save/load path exists. | P0 |
| Memory Brief generation | ✅ Done | Generates continuation artifacts into outputs. | P0 |
| Workspace management polish | 🟡 Partial / needs polish | Functional but still utility-like. | P1 |
| Cloud sync/account system | 🟣 Future / optional | Out of alpha scope. | P3 |

### 4. Product Trust Systems

| Feature/System | Status | Notes | Priority |
| --- | --- | --- | --- |
| Setup/health check | ✅ Done | Provider health scan and refresh lock exist. | P0 |
| Readiness checks | ✅ Done | Agent start validates command/provider readiness. | P0 |
| Runtime error cards | ✅ Done | Medium/high confidence errors render and log history events. | P0 |
| Known issues document | ✅ Done | `docs/KNOWN_ISSUES.md` exists. | P0 |
| QA regression document | ✅ Done | `docs/QA_REGRESSION.md` exists. | P0 |
| Clean-machine trust QA | ❌ Not started | Current next P0 task; checklist created in `docs/CLEAN_MACHINE_QA.md`, but not run yet. | P0 |

### 5. Generated Artifacts / Sharing

| Feature/System | Status | Notes | Priority |
| --- | --- | --- | --- |
| Output Shelf | ✅ Done | Preview, attach, copy, and delete exist. | P0 |
| Transcript export | ✅ Done | Best-effort export exists; TUI output can be noisy. | P1 |
| Build/public export kit | ✅ Done | Release notes, checklist, and progress files can be generated. | P1 |
| Share Progress flow | ✅ Done | Generated markdown output path exists. | P1 |
| Output Shelf artifact polish | 🟡 Partial / needs polish | Cards can better explain why outputs matter. | P1 |
| Bulk delete | 🟣 Future / optional | Intentionally deferred for V1 safety. | P3 |

### 6. UI / Product Feel

| Feature/System | Status | Notes | Priority |
| --- | --- | --- | --- |
| Dark hacker/workbench feel | ✅ Done | Current visual system is compact and terminal-native. | P0 |
| Light theme | 🟡 Partial / needs polish | Needs full QA. | P2 |
| Add Context density reduction | 🟡 Partial / needs polish | Priority UX simplification task. | P0 |
| Release identity and branding | 🟡 Partial / needs polish | Naming and README pass completed; final app icon assets and installer visual QA still required. | P0 |
| Internal/dev wording cleanup | 🟡 Partial / needs polish | Main UI copy pass completed; continue auditing secondary docs/screens. | P0 |

### 7. Agent Dock / Signature Identity

| Feature/System | Status | Notes | Priority |
| --- | --- | --- | --- |
| Agent Dock navigation | ✅ Done | Agent Dock is implemented and usable. | P0 |
| Dock lifecycle/status cues | ✅ Done | Existing lifecycle indicators are present. | P1 |
| Signature identity polish | 🟡 Partial / needs polish | Needs stronger recognizable CMDino product feel. | P0 |
| Dock tooltip/details polish | 🟡 Partial / needs polish | Current behavior works; can be sharper. | P2 |

### 8. Workspace Templates / Onboarding

| Feature/System | Status | Notes | Priority |
| --- | --- | --- | --- |
| Workspace templates | ✅ Done | Template configs exist for common workflows. | P0 |
| Welcome/first-run CTA logic | ✅ Done | QA source pass verifies CTA tiering. | P0 |
| Setup Check onboarding | ✅ Done | Health entry point exists. | P0 |
| Quickstart guide | 🟡 Partial / needs polish | QA kit quickstart created in `qa-release/QUICKSTART.md`; final distribution copy still needs feedback URL. | P0 |
| Dogfood onboarding proof | ❌ Not started | Must prove a real project can be built with CMDino. | P0 |

### 9. Local Data Management

| Feature/System | Status | Notes | Priority |
| --- | --- | --- | --- |
| Local workspace storage | ✅ Done | Workspaces are local to the machine. | P0 |
| Output artifact storage | ✅ Done | Outputs are stored and listed locally. | P0 |
| Output deletion | ✅ Done | Single-file delete exists with confirmation. | P1 |
| Workspace deletion | ✅ Done | Saved workspaces can be deleted. | P1 |
| Stale reference cleanup UX | 🟡 Partial / needs polish | Deleted outputs can leave attachment references. | P1 |
| Account/cloud/license data | ❌ Not started | Needed only if distribution model requires it. | P2 |

### 10. Testing / QA

| Feature/System | Status | Notes | Priority |
| --- | --- | --- | --- |
| Production build QA | ✅ Done | `npm.cmd run build` passed in QA regression. | P0 |
| Rust check | ✅ Done | `cargo check` passed with known warning. | P0 |
| Tauri build QA | ✅ Done | `npm.cmd run tauri:build` passed. | P0 |
| Manual regression checklist | 🟡 Partial / needs polish | Checklist exists; must run in built app before handoff. | P0 |
| Clean Windows install QA | ❌ Not started | Highest-risk closed-alpha task; execute `docs/CLEAN_MACHINE_QA.md`. | P0 |
| Light theme QA | ❌ Not started | Needed before broader release, not necessarily first alpha. | P2 |

### 11. Payment / Licensing / Distribution

| Feature/System | Status | Notes | Priority |
| --- | --- | --- | --- |
| Paid/free alpha decision | ❌ Not started | Decide before external distribution. | P0 |
| Gumroad / LemonSqueezy / Paddle choice | ❌ Not started | Distribution/payment provider undecided. | P1 |
| License screen or supporter marker | ❌ Not started | Only needed if paid/supporter alpha is chosen. | P1 |
| Terms/privacy/license docs | ❌ Not started | Needed before paid or public distribution. | P1 |
| Update flow | ❌ Not started | Required for practical paid beta. | P1 |
| Signed installer | 🟣 Future / optional | Later trust/distribution improvement. | P2 |

### 12. Public Release / Ready-to-Publish

| Feature/System | Status | Notes | Priority |
| --- | --- | --- | --- |
| Closed alpha pack | 🟡 Partial / needs polish | QA kit created in `qa-release/`; still needs installer copy, feedback path, and clean-machine run. | P0 |
| README finalization | 🟡 Partial / needs polish | Product positioning pass completed; still needs final logo/screenshots. | P0 |
| App icon / installer icon | 🟡 Partial / needs polish | Existing Tauri icon config is present; final app icon assets required before closed-alpha handoff. | P0 |
| Screenshots/video proof | ❌ Not started | Dogfood project should produce this. | P0 |
| Feedback form | ❌ Not started | Needed for closed alpha. | P0 |
| Public launch page | 🟣 Future / optional | Not required while P0 alpha work remains. | P3 |

## Critical Remaining Work

1. Clean-machine installer QA.
2. Final app icon + branding.
3. Closed alpha pack.
4. Dogfood project proof.
5. Payment/license decision.
6. Agent Dock signature polish.
7. Add Context / Artifact Reader polish backlog.
8. README/media finalization.

## Immediate Next Sprint Recommendation

Recommended next sprint: **Clean-Machine Installer QA Sprint**.

Tasks:

- Transfer the latest NSIS and MSI installers to a clean Windows machine or VM.
- Run `qa-release/PACKAGE_QA_KIT.ps1` to copy installers into `qa-release/installers` when available.
- Copy the `qa-release` kit to the clean Windows machine.
- Run `docs/CLEAN_MACHINE_QA.md` from install through uninstall.
- Run `qa-release` kit on clean Windows machine.
- Record OS version, account type, WebView2 state, and installed CLI state.
- Verify Custom Agent with `cmd`, workspace save/load/delete, Output Shelf, and context file flows.
- File blocker/high bugs before starting new feature work.
- Keep clean-machine QA status open until a real non-dev-machine pass is complete.

## Polish Bug Backlog

- Artifact Reader Modal does not update attached state immediately after Add to Agent.
- Add Context panel still has density issues in long preview workflows.
- Output Shelf cards can be more artifact-like.
- Saved workspace management UI is functional but utility-like.
- Agent Dock V1 works but needs stronger signature identity.
- Light theme needs full QA.
- Stale deleted attachment references need clearer UX.
- Gemini auth cannot be safely verified automatically.
- CLI PATH can differ between the system shell and app environment.
- Transcript export is best-effort for TUI CLIs.
- Large Vite chunk warning remains.
- Tauri bundle identifier ends with `.app`.
- Rust dead-code warning for `ProbeOutput.duration_ms`.
- Final app icon assets required.

## Closed Alpha Readiness Checklist

- [ ] Clean Windows install test
- [ ] First launch test
- [ ] Setup Check works
- [ ] Template load works
- [ ] Add Agent works
- [ ] Custom command agent starts
- [ ] Add Context from Output Shelf works
- [ ] Local file picker works
- [ ] Review & Send works
- [ ] Send Latest works
- [ ] Save/Open/Delete workspace works
- [ ] Save Memory Brief works
- [ ] Export Logs works
- [ ] Share Progress works
- [ ] Output Shelf preview/copy/delete works
- [ ] Agent Dock navigation works
- [ ] Known issues documented
- [ ] Quickstart guide ready
- [ ] Feedback form ready

## Dogfood Plan

Goal: build a real mobile app using CMDino and record the process.

Outputs:

- Bugs found.
- UX friction notes.
- Workflow proof.
- Screenshots/videos.
- Build-in-public posts.

## Monetization / Distribution TODO

- Decide Gumroad / LemonSqueezy / Paddle.
- Decide paid alpha vs free closed alpha.
- Add license screen or supporter build marker if needed.
- Prepare terms/privacy/license docs.
- Define update flow.
- Plan signed installer later.

## Development Rule

Before starting a new sprint, Codex should:

1. Read `docs/CMDINO_PRODUCT_TODO.md`.
2. Identify the relevant section.
3. Update status after implementation.
4. Add new bugs to Polish Bug Backlog.
5. Avoid adding new features when a P0 release-readiness task is pending.
