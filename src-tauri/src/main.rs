use os_monitor::get_application_icon_data;
use std::thread;
use tokio;
mod db;
mod system_monitor;
use tauri::command;

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

#[command]
async fn get_app_icon(bundle_id: String) -> Result<String, String> {
    get_application_icon_data(&bundle_id).ok_or_else(|| "Failed to get app icon".to_string())
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
        .invoke_handler(tauri::generate_handler![get_app_icon])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations(&format!("sqlite:{db_path}"), migrations)
                .build(),
        )
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("logs".to_string()),
                    },
                ))
                .build(),
        )
        .setup(|app| {
            let app_handle = app.handle().clone();
            system_monitor::start_monitoring(app_handle);
            println!("setup thread info: {}", get_thread_info());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
