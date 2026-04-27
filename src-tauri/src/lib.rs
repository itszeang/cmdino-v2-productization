mod terminal;

use terminal::{
    kill_terminal, resize_terminal, spawn_terminal, write_terminal, TerminalState,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(TerminalState::new())
        .invoke_handler(tauri::generate_handler![
            spawn_terminal,
            write_terminal,
            resize_terminal,
            kill_terminal,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
