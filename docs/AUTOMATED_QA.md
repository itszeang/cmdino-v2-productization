# CMDino Automated QA Harness V1

## Purpose

This harness gives CMDino two practical QA lanes:

- Fast unit tests for pure TypeScript logic.
- Optional desktop smoke tests for the compiled Tauri app through `tauri-driver` and WebdriverIO.

The default QA command stays fast and does not require a release executable or a running desktop WebDriver service.

## Prerequisites

Install `tauri-driver` outside npm:

```powershell
cargo install tauri-driver --locked
```

## Commands

Run unit tests:

```powershell
npm.cmd run test:unit
```

Run the default fast QA lane:

```powershell
npm.cmd run qa:fast
```

Build the release desktop app:

```powershell
npm.cmd run tauri:build
```

Start `tauri-driver` in a separate terminal:

```powershell
tauri-driver
```

Run desktop smoke tests:

```powershell
npm.cmd run test:e2e:tauri
```

Run the full desktop QA lane:

```powershell
npm.cmd run qa:desktop
```

## QA Lanes

`npm.cmd run qa` is the default fast lane. It runs the web build and unit tests through `qa:fast`.

`npm.cmd run qa:desktop` builds the Tauri release executable and then runs WebdriverIO smoke tests against `src-tauri/target/release/cmdino.exe`. It requires `tauri-driver` to be installed and running on port `4444`.

## Manual-Only Areas

These areas remain manual for V1:

- Real Claude, Codex, Gemini, and Ollama authentication flows.
- PTY and TUI interactive behavior.
- Drag and drop attachment behavior.
- Packaged installer smoke testing.
- Visual animation feel.

## Troubleshooting

If `src-tauri/target/release/cmdino.exe` is missing, run:

```powershell
npm.cmd run tauri:build
```

If `tauri-driver` is not found, install it:

```powershell
cargo install tauri-driver --locked
```

If port `4444` is busy, close the previous `tauri-driver` process and start it again.

If smoke selectors fail after UI copy changes, update `test/specs/smoke.e2e.ts` to match the new visible text.
