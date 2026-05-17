use std::fs;
use std::path::{Component, Path, PathBuf};
use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextLibraryFile {
    pub id: String,
    pub title: String,
    pub target: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_label: Option<String>,
    pub relative_path: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CmdinoContextManifest {
    pub version: u8,
    pub project_root: String,
    pub files: Vec<ContextLibraryFile>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadContextManifestResult {
    pub manifest: CmdinoContextManifest,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub warning: Option<String>,
}

fn empty_manifest(project_root: &str) -> CmdinoContextManifest {
    CmdinoContextManifest {
        version: 1,
        project_root: project_root.to_string(),
        files: Vec::new(),
    }
}

fn project_root_path(project_root: &str) -> Result<PathBuf, String> {
    let root = PathBuf::from(project_root);
    if !root.is_absolute() {
        return Err("projectRoot must be an absolute path".to_string());
    }
    Ok(root)
}

fn context_dir(root: &Path) -> PathBuf {
    root.join(".cmdino").join("context")
}

fn ensure_context_dirs(root: &Path) -> Result<(), String> {
    let dir = context_dir(root);
    fs::create_dir_all(dir.join("global")).map_err(|e| format!("create global context dir: {e}"))?;
    fs::create_dir_all(dir.join("agents")).map_err(|e| format!("create agent context dir: {e}"))?;
    Ok(())
}

fn validate_context_relative_path(relative_path: &str) -> Result<PathBuf, String> {
    let rel = PathBuf::from(relative_path);
    let mut components = rel.components();
    match components.next() {
        Some(Component::Normal(part)) if part == ".cmdino" => {}
        _ => return Err("relativePath must start with .cmdino/context".to_string()),
    }
    match components.next() {
        Some(Component::Normal(part)) if part == "context" => {}
        _ => return Err("relativePath must start with .cmdino/context".to_string()),
    }
    for component in rel.components() {
        match component {
            Component::ParentDir => return Err("relativePath must not contain ..".to_string()),
            Component::Prefix(_) | Component::RootDir => {
                return Err("relativePath must be relative".to_string());
            }
            _ => {}
        }
    }
    if rel.extension().and_then(|ext| ext.to_str()) != Some("md") {
        return Err("Only markdown context files are supported".to_string());
    }
    Ok(rel)
}

fn manifest_path(root: &Path) -> PathBuf {
    context_dir(root).join("manifest.json")
}

#[tauri::command]
pub fn read_project_context_manifest(project_root: String) -> Result<ReadContextManifestResult, String> {
    let root = project_root_path(&project_root)?;
    ensure_context_dirs(&root)?;
    let path = manifest_path(&root);
    if !path.exists() {
        let manifest = empty_manifest(&project_root);
        let json = serde_json::to_string_pretty(&manifest)
            .map_err(|e| format!("serialize context manifest: {e}"))?;
        fs::write(&path, json.as_bytes()).map_err(|e| format!("write context manifest: {e}"))?;
        return Ok(ReadContextManifestResult { manifest, warning: None });
    }

    let raw = fs::read_to_string(&path).map_err(|e| format!("read context manifest: {e}"))?;
    match serde_json::from_str::<CmdinoContextManifest>(&raw) {
        Ok(mut manifest) => {
            manifest.version = 1;
            manifest.project_root = project_root;
            Ok(ReadContextManifestResult { manifest, warning: None })
        }
        Err(e) => Ok(ReadContextManifestResult {
            manifest: empty_manifest(&project_root),
            warning: Some(format!("Context manifest could not be parsed. Starting with an empty manifest until it is saved again: {e}")),
        }),
    }
}

#[tauri::command]
pub fn write_project_context_manifest(
    project_root: String,
    mut manifest: CmdinoContextManifest,
) -> Result<CmdinoContextManifest, String> {
    let root = project_root_path(&project_root)?;
    ensure_context_dirs(&root)?;
    manifest.version = 1;
    manifest.project_root = project_root;
    let path = manifest_path(&root);
    let json = serde_json::to_string_pretty(&manifest)
        .map_err(|e| format!("serialize context manifest: {e}"))?;
    fs::write(&path, json.as_bytes()).map_err(|e| format!("write context manifest: {e}"))?;
    Ok(manifest)
}

#[tauri::command]
pub fn write_project_context_file(
    project_root: String,
    relative_path: String,
    content: String,
) -> Result<String, String> {
    let root = project_root_path(&project_root)?;
    ensure_context_dirs(&root)?;
    let rel = validate_context_relative_path(&relative_path)?;
    let full = root.join(&rel);
    if full.exists() {
        return Err(format!("Context file already exists: {relative_path}"));
    }
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("create context dirs: {e}"))?;
    }
    fs::write(&full, content.as_bytes()).map_err(|e| format!("write context file: {e}"))?;
    Ok(full.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn read_project_context_file(
    project_root: String,
    relative_path: String,
) -> Result<String, String> {
    let root = project_root_path(&project_root)?;
    let rel = validate_context_relative_path(&relative_path)?;
    let full = root.join(&rel);
    fs::read_to_string(&full).map_err(|e| format!("read context file: {e}"))
}
