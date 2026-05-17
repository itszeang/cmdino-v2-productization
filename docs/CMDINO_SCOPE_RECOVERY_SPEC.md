# CMDino Scope Recovery Spec

## Purpose

CMDino is not being rebuilt from scratch. This spec realigns the existing app around the intended product vision while preserving the working terminal, context, output, health, and workspace systems already in place.

The current app is a useful foundation. The next product direction is to make that foundation feel like a guided, human-in-the-loop multi-agent coding environment instead of only a manual terminal cockpit.

## Existing Features Stay

- Terminal Grid / Focus
- Agent Map
- Output Shelf
- Activity Log
- Setup Check
- Runtime Error Cards
- Workspace save/load
- Dino lifecycle
- Context attachments
- Agent presets

## New Product Center

- Project Workspace
- Main CMDino Chat
- Agent Team / Orchestration
- Human-in-the-loop Intervention system
- Final output returned to chat
- Build-in-public artifact generation

## Core User Flow

Open project -> choose agent team -> write task -> agents execute workflow -> intervene if needed -> final output appears in chat.

## Dashboard Role Changes

- Terminal Grid = execution monitor / debug / manual intervention surface
- Agent Map = workflow execution visualization
- Output Shelf = workflow artifacts and generated outputs
- Activity Log = workflow timeline
- Setup Check = readiness and intervention recovery surface
- CMDino Chat = main user-facing task interface

## Safety Principle

CMDino should pause workflows when auth, permission, CLI failure, user input, or manual review is required.

An intervention should be visible in both:

- Main CMDino Chat as a clickable intervention card.
- Left toolbar/sidebar as an intervention badge or alert.

Example intervention:

```txt
Codex Builder needs your input

Reason:
Permission prompt detected in terminal.

[Open Codex Terminal] [Retry Step] [Stop Workflow]
```

## What Not To Build Yet

- Full autonomous DAG engine
- Parallel agent execution
- Conditional branching
- Automatic file patching
- Cloud sync
- Accounts/payments/licensing
- SQLite migration
- Watcher local model

## Implementation Boundary

Sprint 1 establishes product direction and type-safe domain language. It should not change PTY lifecycle, terminal spawning, file writes, context attachment semantics, output generation, or workspace persistence.

