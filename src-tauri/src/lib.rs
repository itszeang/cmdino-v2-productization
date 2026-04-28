mod terminal;
mod workspace;
mod files;

use terminal::{
    kill_terminal, resize_terminal, spawn_terminal, write_terminal, TerminalState,
};
use workspace::{list_workspace_files, load_workspace_file, save_workspace_file};
use files::read_file_preview;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(TerminalState::new())
        .invoke_handler(tauri::generate_handler![
            spawn_terminal,
            write_terminal,
            resize_terminal,
            kill_terminal,
            save_workspace_file,
            load_workspace_file,
            list_workspace_files,
            read_file_preview,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
