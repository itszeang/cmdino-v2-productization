use std::fs;
use std::path::PathBuf;
use std::time::UNIX_EPOCH;
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryBriefFile {
    pub file_name: String,
    pub content: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryBriefWriteResult {
    pub output_dir: String,
    pub files: Vec<String>,
    pub count: usize,
}

fn outputs_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let dir = base.join("outputs");
    fs::create_dir_all(&dir).map_err(|e| format!("create outputs dir: {e}"))?;
    Ok(dir)
}

fn sanitize_file_name(name: &str) -> String {
    let clean: String = name
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' || c == '.' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let trimmed = clean.trim_matches(|c| c == '_' || c == '.');
    let capped = if trimmed.len() > 128 {
        &trimmed[..128]
    } else {
        trimmed
    };
    if capped.is_empty() {
        "AGENT_SESSION_MEMORY.md".to_string()
    } else {
        capped.to_string()
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedOutputFile {
    pub path:        String,
    pub file_name:   String,
    pub size_bytes:  u64,
    pub modified_at: u64,
    pub kind:        String,
}

#[tauri::command]
pub fn list_output_files(app: tauri::AppHandle) -> Result<Vec<GeneratedOutputFile>, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let dir = base.join("outputs");
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let entries = fs::read_dir(&dir).map_err(|e| format!("list outputs: {e}"))?;
    let mut files: Vec<GeneratedOutputFile> = entries
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().into_owned();
            if !name.ends_with(".md") && !name.ends_with(".txt") {
                return None;
            }
            let meta = e.metadata().ok()?;
            let path = e.path().to_str()?.to_string();
            let size_bytes  = meta.len();
            let modified_at = meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0);
            let lower = name.to_lowercase();
            let kind = if lower.contains("session_memory") || lower.contains("_memory") {
                "memory_brief"
            } else if lower.contains("transcript") {
                "transcript"
            } else if lower.ends_with(".txt") {
                "text"
            } else {
                "markdown"
            };
            Some(GeneratedOutputFile {
                path,
                file_name: name,
                size_bytes,
                modified_at,
                kind: kind.to_string(),
            })
        })
        .collect();
    files.sort_by(|a, b| b.modified_at.cmp(&a.modified_at));
    Ok(files)
}

#[tauri::command]
pub fn write_memory_briefs(
    app: tauri::AppHandle,
    files: Vec<MemoryBriefFile>,
) -> Result<MemoryBriefWriteResult, String> {
    let dir = outputs_dir(&app)?;
    let mut written: Vec<String> = Vec::new();

    for file in &files {
        let safe_name = sanitize_file_name(&file.file_name);
        if !safe_name.ends_with(".md") {
            continue;
        }
        let path = dir.join(&safe_name);
        fs::write(&path, file.content.as_bytes())
            .map_err(|e| format!("write {safe_name}: {e}"))?;
        written.push(safe_name);
    }

    Ok(MemoryBriefWriteResult {
        output_dir: dir.to_string_lossy().into_owned(),
        files: written.clone(),
        count: written.len(),
    })
}

/// Write a prompt file to a path relative to the given project directory.
/// The relative path must not contain `..` or root components.
/// Creates intermediate directories as needed.
/// Returns the absolute path of the written file.
#[tauri::command]
pub fn write_prompt_file(dir: String, rel_path: String, content: String) -> Result<String, String> {
    let base = PathBuf::from(&dir);
    if !base.is_absolute() {
        return Err("dir must be an absolute path".to_string());
    }
    let rel = PathBuf::from(&rel_path);
    for component in rel.components() {
        match component {
            std::path::Component::ParentDir => {
                return Err("rel_path must not contain ..".to_string());
            }
            std::path::Component::Prefix(_) | std::path::Component::RootDir => {
                return Err("rel_path must be a relative path".to_string());
            }
            _ => {}
        }
    }
    let full = base.join(&rel);
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("create dirs: {e}"))?;
    }
    fs::write(&full, content.as_bytes()).map_err(|e| format!("write prompt file: {e}"))?;
    Ok(full.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn delete_output_file(
    app: tauri::AppHandle,
    file_name: String,
) -> Result<bool, String> {
    let safe_name = sanitize_file_name(&file_name);
    if !safe_name.ends_with(".md") && !safe_name.ends_with(".txt") {
        return Err(format!("Only .md and .txt files may be deleted: {safe_name}"));
    }
    let dir  = outputs_dir(&app)?;
    let path = dir.join(&safe_name);
    if !path.exists() {
        return Ok(false);
    }
    if path.is_dir() {
        return Err(format!("Expected a file, found directory: {}", path.display()));
    }
    // Canonical parent check — reject any path that escapes the outputs dir.
    if let (Ok(cp), Ok(cd)) = (path.canonicalize(), dir.canonicalize()) {
        if cp.parent() != Some(cd.as_path()) {
            return Err("Path escapes outputs directory".to_string());
        }
    }
    fs::remove_file(&path).map_err(|e| format!("delete output: {e}"))?;
    Ok(true)
}
