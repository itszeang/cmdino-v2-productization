use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use tauri::Manager;

// ── Path helpers ──────────────────────────────────────────────────────────────

fn agents_dir(app: &tauri::AppHandle, workspace_id: &str) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let dir = base
        .join("session-logs")
        .join("workspaces")
        .join(workspace_id)
        .join("agents");
    fs::create_dir_all(&dir).map_err(|e| format!("create agents dir: {e}"))?;
    Ok(dir)
}

fn log_path(
    app: &tauri::AppHandle,
    workspace_id: &str,
    agent_config_id: &str,
) -> Result<PathBuf, String> {
    Ok(agents_dir(app, workspace_id)?.join(format!("{}.jsonl", agent_config_id)))
}

fn exports_dir(app: &tauri::AppHandle, workspace_id: &str) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let dir = base
        .join("session-logs")
        .join("workspaces")
        .join(workspace_id)
        .join("exports");
    fs::create_dir_all(&dir).map_err(|e| format!("create exports dir: {e}"))?;
    Ok(dir)
}

fn safe_filename_part(s: &str) -> String {
    let raw: String = s
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' { c } else { '_' })
        .take(32)
        .collect();
    let t = raw.trim_matches('_').to_string();
    if t.is_empty() { "unnamed".into() } else { t }
}

// ── Export rendering ──────────────────────────────────────────────────────────

fn ms_to_hms(ts_ms: u64) -> String {
    let s = (ts_ms / 1000) % 86400;
    format!("{:02}:{:02}:{:02}", s / 3600, (s % 3600) / 60, s % 60)
}

fn event_label(t: &str) -> &'static str {
    match t {
        "terminal_start"     => "Terminal Started",
        "terminal_restart"   => "Terminal Restarted",
        "terminal_kill"      => "Killed",
        "terminal_exited"    => "Process Exited",
        "terminal_error"     => "Error",
        "terminal_output"    => "Output Block",
        "manual_send"        => "File Sent",
        "preset_brain_send"  => "Preset Brain Sent",
        "manual_handoff"     => "Manual Handoff",
        "auto_forward"       => "Auto Forward",
        "attachment_added"   => "Attachment Added",
        "attachment_removed" => "Attachment Removed",
        "agent_created"      => "Agent Created",
        "agent_updated"      => "Agent Updated",
        _                    => "Event",
    }
}

fn is_milestone(t: &str) -> bool {
    matches!(
        t,
        "terminal_start"
            | "terminal_restart"
            | "terminal_kill"
            | "terminal_exited"
            | "terminal_error"
            | "agent_created"
            | "agent_updated"
    )
}

fn render_event(ev: &serde_json::Value, is_md: bool) -> String {
    let ts    = ev["ts"].as_u64().unwrap_or(0);
    let tstr  = if ts > 0 { ms_to_hms(ts) } else { "??:??:??".to_string() };
    let etype = ev["type"].as_str().unwrap_or("");
    let label = event_label(etype);
    let mut out = String::new();

    if is_md {
        out.push_str(&format!("### {} — {}\n\n", tstr, label));
    } else {
        out.push_str(&format!("[{}] {}\n", tstr, label));
    }

    if let Some(p) = ev.get("payload").and_then(|v| v.as_object()) {
        for (key, display) in &[
            ("fileName",    "File"),
            ("targetLabel", "Target"),
            ("reason",      "Reason"),
            ("error",       "Error"),
        ] {
            if let Some(v) = p.get(*key).and_then(|v| v.as_str()) {
                out.push_str(&format!("{}: {}\n", display, v));
            }
        }
        if let Some(text) = p.get("text").and_then(|v| v.as_str()) {
            if is_md {
                out.push_str("```\n");
                out.push_str(text);
                if !text.ends_with('\n') { out.push('\n'); }
                out.push_str("```\n");
            } else {
                out.push_str(text);
                if !text.ends_with('\n') { out.push('\n'); }
            }
        }
    }
    out.push('\n');
    out
}

fn render_section(events: &[&serde_json::Value], title: &str, is_md: bool) -> String {
    if events.is_empty() { return String::new(); }
    let mut out = String::new();
    if is_md {
        out.push_str(&format!("## {}\n\n", title));
    } else {
        out.push_str(&format!("{}\n{}\n\n", title, "-".repeat(title.len())));
    }
    for ev in events { out.push_str(&render_event(ev, is_md)); }
    out
}

fn render_export(
    events: &[serde_json::Value],
    workspace_name: &str,
    agent_label: &str,
    is_md: bool,
) -> String {
    let mut out = String::new();
    if is_md {
        out.push_str("# CMDino Session Log\n\n");
        out.push_str(&format!("**Workspace:** {}\n\n", workspace_name));
        out.push_str(&format!("**Agent:** {}\n\n", agent_label));
        out.push_str("---\n\n");
    } else {
        out.push_str("CMDino Session Log\n");
        out.push_str(&format!("Workspace: {}\n", workspace_name));
        out.push_str(&format!("Agent:     {}\n\n", agent_label));
    }

    let milestones: Vec<&serde_json::Value> = events
        .iter().filter(|e| is_milestone(e["type"].as_str().unwrap_or(""))).collect();
    let sends: Vec<&serde_json::Value> = events.iter()
        .filter(|e| matches!(e["type"].as_str().unwrap_or(""), "manual_send" | "preset_brain_send")).collect();
    let handoffs: Vec<&serde_json::Value> = events.iter()
        .filter(|e| matches!(e["type"].as_str().unwrap_or(""), "manual_handoff" | "auto_forward")).collect();
    let outputs: Vec<&serde_json::Value> = events.iter()
        .filter(|e| e["type"].as_str().unwrap_or("") == "terminal_output").collect();

    out.push_str(&render_section(&milestones, "Milestones",     is_md));
    out.push_str(&render_section(&sends,      "Sent Context",   is_md));
    out.push_str(&render_section(&handoffs,   "Handoffs",       is_md));
    out.push_str(&render_section(&outputs,    "Terminal Output", is_md));
    out
}

// ── Tauri commands ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn append_session_log_event(
    app: tauri::AppHandle,
    workspace_id: String,
    agent_config_id: String,
    event_json: String,
) -> Result<(), String> {
    let path = log_path(&app, &workspace_id, &agent_config_id)?;
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| format!("open log: {e}"))?;
    writeln!(file, "{}", event_json.trim()).map_err(|e| format!("write log: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn read_session_log(
    app: tauri::AppHandle,
    workspace_id: String,
    agent_config_id: String,
    max_events: usize,
) -> Result<Vec<String>, String> {
    let path = log_path(&app, &workspace_id, &agent_config_id)?;
    if !path.exists() { return Ok(vec![]); }
    let reader = BufReader::new(
        fs::File::open(&path).map_err(|e| format!("open log: {e}"))?,
    );
    let mut lines: Vec<String> = reader
        .lines()
        .filter_map(|l| l.ok())
        .filter(|l| !l.trim().is_empty())
        .collect();
    if lines.len() > max_events {
        lines.drain(..lines.len() - max_events);
    }
    Ok(lines)
}

#[tauri::command]
pub fn clear_session_log(
    app: tauri::AppHandle,
    workspace_id: String,
    agent_config_id: String,
) -> Result<(), String> {
    let path = log_path(&app, &workspace_id, &agent_config_id)?;
    if path.exists() {
        fs::write(&path, b"").map_err(|e| format!("clear log: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub fn export_session_log(
    app: tauri::AppHandle,
    workspace_id: String,
    agent_config_id: String,
    workspace_name: String,
    agent_label: String,
    format: String,
) -> Result<String, String> {
    let path = log_path(&app, &workspace_id, &agent_config_id)?;
    let events: Vec<serde_json::Value> = if path.exists() {
        let reader = BufReader::new(
            fs::File::open(&path).map_err(|e| format!("open log: {e}"))?,
        );
        reader
            .lines()
            .filter_map(|l| l.ok())
            .filter(|l| !l.trim().is_empty())
            .filter_map(|l| serde_json::from_str(&l).ok())
            .collect()
    } else {
        vec![]
    };

    let is_md  = format.as_str() == "md";
    let ext    = if is_md { "md" } else { "txt" };
    let content = render_export(&events, &workspace_name, &agent_label, is_md);

    let ts_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    let filename = format!(
        "{}-{}-{}.{}",
        safe_filename_part(&workspace_name),
        safe_filename_part(&agent_label),
        ts_ms,
        ext
    );

    let out_path: PathBuf = match app.path().download_dir() {
        Ok(dl) => {
            let dir = dl.join("CMDino Logs");
            if fs::create_dir_all(&dir).is_ok() { dir.join(&filename) }
            else { exports_dir(&app, &workspace_id)?.join(&filename) }
        }
        Err(_) => exports_dir(&app, &workspace_id)?.join(&filename),
    };

    fs::write(&out_path, content.as_bytes()).map_err(|e| format!("write export: {e}"))?;
    Ok(out_path.to_string_lossy().into_owned())
}
