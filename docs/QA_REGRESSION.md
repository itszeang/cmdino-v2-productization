# CMDino Alpha QA Regression

Date: 2026-05-01
Status: Alpha regression pass for final productization Block 2

## Environment

| Item | Value |
| --- | --- |
| OS | Microsoft Windows NT 10.0.26200.0, 64-bit |
| Shell | PowerShell |
| Working directory | `C:\Users\burak\Desktop\cmdino-build` |
| Node.js | `v24.13.1` |
| npm | `11.8.0` via `npm.cmd` |
| Rust | `rustc 1.95.0` |
| Cargo | `cargo 1.95.0` |
| Tauri CLI | `tauri-cli 2.10.1` |
| App package | `cmdino@0.1.0-alpha.1` |

## Build Commands Run

| Command | Result | Notes |
| --- | --- | --- |
| `npm.cmd run build` | PASS | TypeScript compile and Vite production build completed. |
| `npm.cmd run tauri:build` | PASS | Rebuilt release EXE plus MSI and NSIS bundles. |
| `npm.cmd exec tauri -- --version` | PASS | Reported `tauri-cli 2.10.1`. |
| Release EXE launch smoke | PASS | `src-tauri\target\release\cmdino.exe` started and stayed alive for 8 seconds before being closed. |

Build warnings observed:

- Vite reports one minified JS chunk larger than 500 kB: `dist/assets/index-15QdS0hj.js` at 541.13 kB, gzip 148.77 kB.
- Tauri reports that bundle identifier `com.cmdino.app` ends in `.app`, which is not recommended for macOS bundle naming.

Generated release artifacts:

| Artifact | Size |
| --- | ---: |
| `src-tauri\target\release\cmdino.exe` | 4,030,976 bytes |
| `src-tauri\target\release\bundle\msi\CMDino_0.1.0_x64_en-US.msi` | 2,527,232 bytes |
| `src-tauri\target\release\bundle\nsis\CMDino_0.1.0_x64-setup.exe` | 1,973,748 bytes |

## Regression Matrix

Status key:

- PASS: directly verified by command/build/smoke in this pass, or source-verified with production build passing.
- PRIOR PASS: previously reported as passed before this pass; not fully repeated interactively here.
- WARN: behavior works within alpha constraints but has known limitations.

| # | Area | Status | Notes |
| ---: | --- | --- | --- |
| 1 | App launch | PASS | Release EXE starts and remains alive. Full interactive desktop click-through was not automated. |
| 2 | First-run onboarding / empty state | PASS | Source paths for welcome modal, onboarding reset, empty state, and demo load are present; production build passes. |
| 3 | Dark/light theme | PASS | Settings and CSS theme tokens are present; production build passes. |
| 4 | Deploy Agent modal | PASS | Deploy modal and preset/custom configuration paths are present; production build passes. |
| 5 | Agent Edit / Manage | PASS | Post-deploy edit/manage component is present; production build passes. |
| 6 | Custom Agent command execution | PASS | PTY bridge, readiness bridge, terminal process hook, and custom command paths build successfully. Runtime depends on local shell/CLI availability. |
| 7 | Preset agent start | PASS | Preset definitions and readiness-aware start paths build successfully. Runtime depends on installed `claude`, `codex`, `gemini`, or `ollama` CLIs. |
| 8 | Preset brain preview/send | PASS | Preset brain config, file bridge, attachment panel, preview, and send paths build successfully. |
| 9 | Readiness guard: fake command | PASS | Executable readiness validation path is present and included in build. Expected behavior is start/restart blocked with user-facing error. |
| 10 | Readiness guard: invalid cwd | PASS | Working-directory readiness validation path is present and included in build. Expected behavior is start/restart blocked with user-facing error. |
| 11 | Focus/Grid | PASS | View-mode state and terminal grid rendering paths build successfully. |
| 12 | Per-pane maximize/restore | PASS | Focused pane/grid paths build successfully. |
| 13 | Manual handoff | PASS | Handoff modal, output capture path, target send path, and workflow-link recording build successfully. |
| 14 | Auto Forward Lite | WARN | Forward path builds successfully. Best results require selected text or clean recent output; raw TUI output may be noisy. |
| 15 | Workflow graph | WARN | Workflow panel and directional link persistence paths build successfully. Current graph visualizes links; drag/drop workflow building is not implemented. |
| 16 | Workspace save/load | PASS | Workspace bridge, domain validator, save/load controls, and demo workspace paths build successfully. Live PTY state is intentionally not serialized. |
| 17 | Demo workflow | PASS | Demo workspace config and load paths build successfully. |
| 18 | Session History / Event Timeline | PASS | Session log domain, state hook, drawer UI, and event append paths build successfully. It records events, not full terminal transcripts. |
| 19 | Dino lifecycle: egg, hatch, running/move, killed/dead or removed | PASS | Dino manifest, state map, lane, animator, and terminal-to-dino state machine paths build successfully. |
| 20 | Packaged app smoke test | PRIOR PASS | User-reported packaged installer smoke test passed before this pass. This pass rebuilt bundles and minimally launched the release EXE. |
| 21 | Build commands | PASS | `npm.cmd run build` and `npm.cmd run tauri:build` both completed successfully. |

## Packaged App Smoke Notes

- Existing packaged installer smoke test was reported as passed before this regression pass.
- This pass rebuilt both Windows bundles from source.
- This pass minimally launched `src-tauri\target\release\cmdino.exe`; the process stayed alive for 8 seconds and was then closed.
- This pass did not perform an interactive reinstall flow through the MSI or NSIS installer UI.

## Notes

- No code patches were made during this QA pass.
- The Vite chunk-size warning remains a known alpha issue.
- The Tauri bundle identifier warning is low risk for the current Windows alpha, but should be fixed before serious macOS distribution.
- Frontend-only Vite preview remains insufficient for PTY testing because real terminal execution requires Tauri.
