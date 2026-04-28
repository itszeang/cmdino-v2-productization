use std::fs;
use std::path::PathBuf;
use tauri::Manager;

fn workspaces_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let dir = base.join("workspaces");
    fs::create_dir_all(&dir).map_err(|e| format!("create workspaces dir: {e}"))?;
    Ok(dir)
}

/// Converts a name slug into a safe filesystem filename.
fn to_file_name(slug: &str) -> String {
    let clean: String = slug
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let trimmed = clean.trim_matches('_');
    let capped  = if trimmed.len() > 64 { &trimmed[..64] } else { trimmed };
    format!("{}.cmdino.json", if capped.is_empty() { "untitled" } else { capped })
}

#[tauri::command]
pub fn save_workspace_file(
    app: tauri::AppHandle,
    file_name: String,
    content: String,
) -> Result<String, String> {
    let dir  = workspaces_dir(&app)?;
    let path = dir.join(to_file_name(&file_name));
    fs::write(&path, content.as_bytes()).map_err(|e| format!("write workspace: {e}"))?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn load_workspace_file(
    app: tauri::AppHandle,
    file_name: String,
) -> Result<String, String> {
    let dir  = workspaces_dir(&app)?;
    let path = dir.join(to_file_name(&file_name));
    fs::read_to_string(&path).map_err(|e| format!("read workspace: {e}"))
}

#[tauri::command]
pub fn list_workspace_files(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let dir = workspaces_dir(&app)?;
    let entries = fs::read_dir(&dir).map_err(|e| format!("list workspaces: {e}"))?;
    let mut names: Vec<String> = entries
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().into_owned();
            name.strip_suffix(".cmdino.json").map(|n| n.to_string())
        })
        .collect();
    names.sort();
    Ok(names)
}
