use std::{thread, time::Duration};
use tokio;

mod db;
mod system_monitor;

fn get_thread_info() -> String {
    let current = thread::current();
    let is_main = current.name().map_or(false, |name| name == "main");

    format!(
        "Thread ID: {:?}, Thread Name: {:?}, Is Main: {}",
        current.id(),
        current.name().unwrap_or("unnamed"),
        is_main
    )
}

#[tokio::main]
async fn main() {
    tauri::async_runtime::set(tokio::runtime::Handle::current());
    let db_path = db::get_db_path();
    let path = std::path::Path::new(&db_path);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).expect("Failed to create directory");
    }

    let migrations = db::get_migrations();
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations(&format!("sqlite:{db_path}"), migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            system_monitor::simulate_main_thread_block
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();
            system_monitor::start_monitoring(app_handle);
            println!("setup thread info: {}", get_thread_info());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
