use std::collections::HashMap;
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
    code: i32,
}

// ── Per-agent PTY handle ──────────────────────────────────────────────────────

struct PtyHandle {
    master: Box<dyn portable_pty::MasterPty + Send>,
    writer: Box<dyn Write + Send>,
}

// ── Shared app state ──────────────────────────────────────────────────────────

pub struct TerminalState(Arc<Mutex<HashMap<String, PtyHandle>>>);

impl TerminalState {
    pub fn new() -> Self {
        TerminalState(Arc::new(Mutex::new(HashMap::new())))
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
) -> Result<(), String> {
    {
        let map = state.0.lock().unwrap();
        if map.contains_key(&agent_id) {
            return Err(format!("terminal already running for {agent_id}"));
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

    // Drop slave so master read reaches EOF when child exits (required on Unix,
    // harmless on Windows ConPTY).
    drop(slave);

    let writer = master
        .take_writer()
        .map_err(|e| format!("take_writer: {e}"))?;

    let mut reader = master
        .try_clone_reader()
        .map_err(|e| format!("clone_reader: {e}"))?;

    // Spawn reader thread — streams PTY output as terminal:data events
    let app_clone     = app.clone();
    let id_clone      = agent_id.clone();
    let state_arc     = state.0.clone();

    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).into_owned();
                    let _ = app_clone.emit(
                        "terminal:data",
                        DataPayload { agent_id: id_clone.clone(), data },
                    );
                }
            }
        }
        state_arc.lock().unwrap().remove(&id_clone);
        let _ = app_clone.emit(
            "terminal:exit",
            ExitPayload { agent_id: id_clone, code: 0 },
        );
    });

    state.0.lock().unwrap().insert(agent_id, PtyHandle { master, writer });

    Ok(())
}

#[tauri::command]
pub fn write_terminal(
    state: tauri::State<'_, TerminalState>,
    agent_id: String,
    data: String,
) -> Result<(), String> {
    let mut map = state.0.lock().unwrap();
    let handle = map.get_mut(&agent_id).ok_or("terminal not found")?;
    handle
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn resize_terminal(
    state: tauri::State<'_, TerminalState>,
    agent_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let map = state.0.lock().unwrap();
    let handle = map.get(&agent_id).ok_or("terminal not found")?;
    handle
        .master
        .resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn kill_terminal(
    state: tauri::State<'_, TerminalState>,
    agent_id: String,
) -> Result<(), String> {
    state.0.lock().unwrap().remove(&agent_id);
    Ok(())
}
