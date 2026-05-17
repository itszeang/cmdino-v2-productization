use std::collections::{HashMap, HashSet};
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};

use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

// ── Tauri event payloads ──────────────────────────────────────────────────────

#[derive(Clone, Serialize)]
pub struct DataPayload {
    agent_id: String,
    data: String,
}

#[derive(Clone, Serialize)]
pub struct ExitPayload {
    agent_id: String,
    code: Option<i32>,
    reason: String, // "exited" | "killed" | "error"
}

// ── Per-agent PTY handle ──────────────────────────────────────────────────────

struct PtyHandle {
    master: Box<dyn portable_pty::MasterPty + Send>,
    writer: Box<dyn Write + Send>,
}

// ── Shared app state ──────────────────────────────────────────────────────────

struct StateInner {
    sessions: HashMap<String, PtyHandle>,
    // Tracks agent IDs that were intentionally killed so the reader thread
    // does not emit a duplicate "exited" event.
    killed: HashSet<String>,
}

pub struct TerminalState(Arc<Mutex<StateInner>>);

impl TerminalState {
    pub fn new() -> Self {
        TerminalState(Arc::new(Mutex::new(StateInner {
            sessions: HashMap::new(),
            killed: HashSet::new(),
        })))
    }
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn spawn_terminal(
    state: tauri::State<'_, TerminalState>,
    app: AppHandle,
    agent_id: String,
    shell: String,
    cwd: String,
    cols: u16,
    rows: u16,
) -> Result<String, String> {
    // If session already exists, report it as a successful attach — not an error.
    // The frontend treats "already_running" as a reconnect: lifecycle → running,
    // no new PTY, no launchCommand resend.
    {
        let inner = state
            .0
            .lock()
            .map_err(|_| "terminal state lock poisoned".to_string())?;
        if inner.sessions.contains_key(&agent_id) {
            return Ok("already_running".to_string());
        }
    }

    let pty_system = native_pty_system();
    let size = PtySize { rows, cols, pixel_width: 0, pixel_height: 0 };

    let pair = pty_system
        .openpty(size)
        .map_err(|e| format!("openpty: {e}"))?;

    let resolved_cwd = if cwd.is_empty() || cwd == "." {
        std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .unwrap_or_else(|_| "C:\\".to_string())
    } else {
        cwd
    };

    let master = pair.master;
    let slave  = pair.slave;

    let mut cmd = CommandBuilder::new(&shell);
    cmd.cwd(&resolved_cwd);

    let _child = slave
        .spawn_command(cmd)
        .map_err(|e| format!("spawn: {e}"))?;
    drop(slave);

    let writer = master
        .take_writer()
        .map_err(|e| format!("take_writer: {e}"))?;

    let mut reader = master
        .try_clone_reader()
        .map_err(|e| format!("clone_reader: {e}"))?;

    // Insert handle BEFORE spawning reader thread to avoid early-exit races.
    state
        .0
        .lock()
        .map_err(|_| "terminal state lock poisoned".to_string())?
        .sessions
        .insert(agent_id.clone(), PtyHandle { master, writer });

    let app_clone = app.clone();
    let id_clone  = agent_id.clone();
    let state_arc = state.0.clone();

    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        let mut read_error: Option<String> = None;
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Err(e) => {
                    read_error = Some(e.to_string());
                    break;
                }
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).into_owned();
                    let _ = app_clone.emit(
                        "terminal:data",
                        DataPayload { agent_id: id_clone.clone(), data },
                    );
                }
            }
        }

        // Only emit "exited" if the session was not already killed.
        let should_emit = {
            match state_arc.lock() {
                Ok(mut inner) => {
                    let was_active = inner.sessions.remove(&id_clone).is_some();
                    let was_killed = inner.killed.remove(&id_clone);
                    was_active && !was_killed
                }
                Err(_) => {
                    let _ = app_clone.emit(
                        "terminal:exit",
                        ExitPayload {
                            agent_id: id_clone.clone(),
                            code: None,
                            reason: "error".to_string(),
                        },
                    );
                    false
                }
            }
        };

        if should_emit {
            let is_error = read_error.is_some();
            let _ = app_clone.emit(
                "terminal:exit",
                ExitPayload {
                    agent_id: id_clone,
                    code: if is_error { None } else { Some(0) },
                    reason: if is_error { "error" } else { "exited" }.to_string(),
                },
            );
        }
    });

    Ok("spawned".to_string())
}

#[tauri::command]
pub fn write_terminal(
    state: tauri::State<'_, TerminalState>,
    agent_id: String,
    data: String,
) -> Result<(), String> {
    let mut inner = state
        .0
        .lock()
        .map_err(|_| "terminal state lock poisoned".to_string())?;
    let handle = inner.sessions.get_mut(&agent_id).ok_or("terminal not found")?;
    handle.writer.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
    handle.writer.flush().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn resize_terminal(
    state: tauri::State<'_, TerminalState>,
    agent_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let inner = state
        .0
        .lock()
        .map_err(|_| "terminal state lock poisoned".to_string())?;
    let handle = inner.sessions.get(&agent_id).ok_or("terminal not found")?;
    handle
        .master
        .resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn kill_terminal(
    state: tauri::State<'_, TerminalState>,
    app: AppHandle,
    agent_id: String,
) -> Result<(), String> {
    let removed = {
        let mut inner = state
            .0
            .lock()
            .map_err(|_| "terminal state lock poisoned".to_string())?;
        let removed = inner.sessions.remove(&agent_id);
        if removed.is_some() {
            inner.killed.insert(agent_id.clone());
        }
        removed.is_some()
    };

    if removed {
        // Dropping PtyHandle closes master → ConPTY sends EOF to child → reader thread exits.
        let _ = app.emit(
            "terminal:exit",
            ExitPayload { agent_id, code: None, reason: "killed".to_string() },
        );
    }

    Ok(())
}
