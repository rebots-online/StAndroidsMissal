//! St. Android's Missal — Tauri shell.
//!
//! The native side is deliberately minimal: it hands the embedded corpus
//! database to the frontend, where the SAME sql.js query layer used by the
//! web build runs (collinear debug/production rule — no divergent adapters).

/// The graph+vector corpus, baked into the binary at compile time.
/// `include_bytes!` keeps resource handling identical across desktop and
/// Android (no platform-specific resource path resolution).
static MISSAL_DB: &[u8] = include_bytes!("../../assets/missal.db");

#[tauri::command]
fn load_corpus() -> tauri::ipc::Response {
    tauri::ipc::Response::new(MISSAL_DB.to_vec())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_corpus])
        .run(tauri::generate_context!())
        .expect("error while running St. Android's Missal");
}
