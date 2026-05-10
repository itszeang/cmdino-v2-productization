# CMDino Clean-Machine Installer QA

## Purpose

This checklist verifies CMDino works on a fresh Windows machine before closed alpha distribution. It is meant to catch installer, first-launch, local data, WebView2, PATH, and packaged-resource issues that do not appear on the development machine.

## Test Environments

Use at least one clean environment before sharing with closed alpha users. Use more than one when practical.

| Environment | OS version | User account type | Node/Rust/Git installed | Claude/Codex/Gemini/Ollama installed | Microsoft WebView2 present |
| --- | --- | --- | --- | --- | --- |
| Clean Windows 11 physical machine | Record exact build | Standard or admin; record which | Prefer no | Start with none, then add selected CLIs | Record before install |
| Windows 11 VM | Record exact build | Standard user preferred | Prefer no | Test no-CLI baseline first | Record before install |
| Secondary laptop/user account | Record exact build | Non-dev account preferred | Prefer no | Record existing CLI state | Record before install |
| Optional Windows 10 | Record exact build | Standard or admin; record which | Prefer no | Record existing CLI state | Record before install |

## Pre-Test Requirements

- Latest CMDino installer path:
  - NSIS: `src-tauri/target/release/bundle/nsis/CMDino_0.1.0_x64-setup.exe`
  - MSI: `src-tauri/target/release/bundle/msi/CMDino_0.1.0_x64_en-US.msi`
- Latest build version: `cmdino@0.1.0-alpha.1` / Tauri app version `0.1.0`.
- Known issues docs: `qa-release/KNOWN_ISSUES_ALPHA.md`.
- Feedback form link: `TODO: add closed alpha feedback form URL`.
- Screen recorder optional but recommended for confusing moments and crash reports.
- No dev repo, Node, Rust, Git, or source checkout should be required on the test machine.

## Installer Smoke Test

- [ ] Installer launches
- [ ] No Windows SmartScreen blocker beyond expected unsigned-app warning
- [ ] Installation completes
- [ ] Start menu shortcut exists if expected
- [ ] Desktop shortcut exists if expected
- [ ] App launches from installer
- [ ] App launches after restart
- [ ] Uninstall entry exists in Windows Apps list

## First Launch Test

- [ ] App opens without crash
- [ ] Window title is consistent: `CMDino Alpha`
- [ ] Sidebar brand is consistent
- [ ] Empty state appears
- [ ] First-run welcome/setup appears if not dismissed
- [ ] Setup Check/Health scan runs
- [ ] No dev-only labels like `Modified` appear
- [ ] Local-first / no-cloud message is visible where expected

## Setup Check / Provider Health Test

Run the matrix below as separate passes where possible. If using one machine, record the installed CLI state before each pass.

Test cases:

- No CLIs installed
- Only Ollama installed
- Claude installed but not logged in
- Codex installed
- Gemini installed
- Custom command only

Checklist:

- [ ] Missing providers show clear status
- [ ] Installed/not verified providers do not look broken
- [ ] Auth needed is clear
- [ ] Ollama offline/ready is detected correctly
- [ ] Refresh does not break state
- [ ] Deploy/Add Agent modal reflects provider status

## Basic Workspace Test

- [ ] Start With an Agent opens Add Agent modal
- [ ] Add Custom Agent with command `cmd`
- [ ] Agent pane appears
- [ ] Start agent works
- [ ] Terminal accepts input
- [ ] Focus/Grid toggle works
- [ ] Agent Dock shows the agent
- [ ] Agent Dock click focuses/selects agent

## Template Test

- [ ] Use a Template opens template picker
- [ ] Fullstack App Builder loads
- [ ] Agent Map routes appear
- [ ] Agents appear in dock
- [ ] Start Agents works where providers are available
- [ ] Template preset context is attached
- [ ] Save Workspace works
- [ ] Open Workspace works
- [ ] Delete Workspace works after confirmation

## Context / Attachment Test

- [ ] Add Context panel opens
- [ ] Output Shelf tab works
- [ ] Starter Context tab works
- [ ] Local File tab shows Choose File
- [ ] Choose File opens native file picker
- [ ] `.md`/`.txt` selection works
- [ ] Invalid file type is blocked or not selectable
- [ ] Add to Agent attaches file
- [ ] Send Into Agent is disabled until attached and running
- [ ] Send Into Agent sends text to terminal when valid
- [ ] Remove from Agent works
- [ ] Artifact Reader opens
- [ ] Artifact Reader can read long markdown
- [ ] Copy File Path works

## Output / Artifact Test

- [ ] Save Memory Brief generates output
- [ ] Export Logs generates transcript
- [ ] Share Progress generates build kit files
- [ ] Output Shelf count updates
- [ ] Output Shelf opens
- [ ] Output preview works
- [ ] Open Reader works
- [ ] Copy Text works
- [ ] Copy File Path works
- [ ] Add to Active Agent works
- [ ] Delete output works after confirmation
- [ ] Deleting attached output does not crash app

## Runtime Error Test

- [ ] Custom agent `fakecommand` shows human-readable readiness error
- [ ] Running `fakecommand` inside `cmd` shows runtime error strip/card
- [ ] Runtime error appears in Activity/Errors
- [ ] Ollama unavailable case shows useful message if Ollama is offline
- [ ] Open Setup Check action works where present

## Session Continuity Test

- [ ] Save workspace
- [ ] Close app
- [ ] Reopen app
- [ ] Continue Work panel appears
- [ ] Continue Work loads correct workspace
- [ ] If workspace file is deleted, app handles it gracefully

## Local Data / AppData Test

Expected local data paths are under Tauri `app_data_dir()` for the installed CMDino app.

Known app-created subfolders:

- Workspace files: `<app_data_dir>/workspaces/*.cmdino.json`
- Output files: `<app_data_dir>/outputs/*.md` and `<app_data_dir>/outputs/*.txt`
- Local settings/session state: WebView localStorage keys `cmdino.v1.settings`, `cmdino.v1.last_session`, and `cmdino.v1.session_log`

On Windows, inspect the app data folder through the installed app behavior or the resolved path returned by save/export actions. The exact base folder may vary by Tauri/WebView environment, so record the observed path during QA.

Checklist:

- [ ] App creates needed folders
- [ ] No write permission errors
- [ ] Output files are created locally
- [ ] Workspace files are created locally
- [ ] Deletion is scoped and safe

## Restart / Reopen Test

- [ ] App closes cleanly
- [ ] App reopens cleanly
- [ ] Previous local state is still valid
- [ ] No zombie processes remain after close if observable

## Uninstall Test

- [ ] App uninstalls
- [ ] App no longer appears in Start menu
- [ ] App binaries removed
- [ ] Decide/document whether local AppData remains or should be manually cleared

## Known Expected Warnings

- Unsigned installer may trigger SmartScreen.
- Gemini auth cannot be safely verified automatically.
- CLI PATH may differ between terminal and app environment.
- Transcript export is best-effort for TUI CLIs.
- No cloud sync.
- No autonomous execution.
- Output deletion does not auto-remove stale attachment references.

## Pass / Fail Criteria

PASS:

- Installer works.
- App opens.
- Custom `cmd` agent works.
- Save/load workspace works.
- Output generation/view/delete works.
- Setup Check works.
- No crashes in core flows.

BLOCKER:

- App cannot install.
- App cannot launch.
- Terminal cannot start.
- Workspace save/load is broken.
- Output generation is broken.
- Native file picker is broken.
- App crashes during normal flows.

## Bug Report Template

```text
Environment:
- Machine/VM:
- OS version:
- User account type:
- Node/Rust/Git installed:
- CLI tools installed:
- WebView2 present:

CMDino version:
Installer type:
- NSIS .exe / MSI:

Steps to reproduce:
1.
2.
3.

Expected:

Actual:

Screenshot/video:

Logs if available:

Severity:
- blocker / high / medium / low
```

## Closed Alpha Tester Task List

1. Install CMDino.
2. Open Setup Check.
3. Add a Custom Agent using `cmd`.
4. Start it and run `echo hello`.
5. Use a template.
6. Add a context file.
7. Generate Save Memory Brief.
8. Open Output Shelf.
9. Save and reopen workspace.
10. Report one confusing moment.

## Recommended Testing Order

1. Clean install
2. First launch
3. Setup Check
4. Custom Agent
5. Template
6. Context
7. Outputs
8. Save/load/delete
9. Reopen
10. Uninstall
