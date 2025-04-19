use os_monitor::{
    get_application_icon_data, has_accessibility_permissions, request_accessibility_permissions,
    start_blocking as os_start_blocking, stop_blocking as os_stop_blocking, BlockableItem,
};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::command;
use tokio::time::{sleep, Duration};

use crate::system_monitor;

// Store the current blocking state
static BLOCKING_STATE: Mutex<Option<(Vec<BlockableItem>, bool)>> = Mutex::new(None);
#[derive(Debug, serde::Deserialize)]
pub struct BlockingApp {
    external_id: String,
    is_browser: bool,
}

#[command]
pub async fn get_app_icon(bundle_id: String) -> Result<String, String> {
    get_application_icon_data(&bundle_id).ok_or_else(|| "Failed to get app icon".to_string())
}

#[command]
pub fn start_blocking(blocking_apps: Vec<BlockingApp>, is_block_list: bool, typewriter_mode: bool) {
    let apps: Vec<BlockableItem> = blocking_apps
        .iter()
        .map(|app| BlockableItem {
            app_external_id: app.external_id.clone(),
            is_browser: app.is_browser,
        })
        .collect();

    *BLOCKING_STATE.lock().unwrap() = Some((apps.clone(), is_block_list));

    os_start_blocking(&apps, "https://ebb.cool/vibes", is_block_list);
    if typewriter_mode {
        system_monitor::start_typewriter_mode();
    }
}

#[command]
pub fn stop_blocking() {
    *BLOCKING_STATE.lock().unwrap() = None;
    os_stop_blocking();
    system_monitor::stop_typewriter_mode();
}

#[command]
pub async fn snooze_blocking(duration: u64) -> Result<(), String> {
    let blocking_state = {
        let state = BLOCKING_STATE.lock().map_err(|e| e.to_string())?;
        state.clone()
    };

    if let Some((apps, is_block_list)) = blocking_state {
        os_stop_blocking();

        let sleep_result = tokio::time::timeout(
            Duration::from_millis(duration + 100),
            sleep(Duration::from_millis(duration)),
        )
        .await;

        if sleep_result.is_ok() {
            if let Ok(current_state) = BLOCKING_STATE.lock() {
                let should_resume = current_state
                    .as_ref()
                    .map(|(current_apps, current_is_block_list)| {
                        current_apps.len() == apps.len()
                            && current_apps.iter().zip(apps.iter()).all(|(a, b)| {
                                a.app_external_id == b.app_external_id
                                    && a.is_browser == b.is_browser
                            })
                            && current_is_block_list == &is_block_list
                    })
                    .unwrap_or(false);

                if should_resume {
                    os_start_blocking(&apps, "https://ebb.cool/vibes", is_block_list);
                }
            }
        }

        Ok(())
    } else {
        Err("No active blocking to snooze".to_string())
    }
}

#[command]
pub fn check_accessibility_permissions() -> bool {
    has_accessibility_permissions()
}

#[command]
pub fn request_system_permissions() -> bool {
    request_accessibility_permissions()
}

#[command]
pub fn start_system_monitoring(app_handle: tauri::AppHandle) {
    system_monitor::start_monitoring(app_handle);
}

#[command]
pub fn is_monitoring_running() -> bool {
    system_monitor::is_monitoring_running()
}

#[command]
pub fn reset_app_data_for_testing(backup: bool) -> Result<String, String> {
    let home_dir = dirs::home_dir().expect("Could not find home directory");
    let ebb_db_path = home_dir.join(".ebb").join("ebb-desktop.sqlite");
    let monitor_db_path = home_dir
        .join(".codeclimbers")
        .join("codeclimbers-desktop.sqlite");

    // Helper function to get all related database files (main, WAL, SHM)
    fn get_db_files(base_path: &PathBuf) -> Vec<PathBuf> {
        let mut files = Vec::new();
        files.push(base_path.clone());
        files.push(PathBuf::from(format!(
            "{}-wal",
            base_path.to_string_lossy()
        )));
        files.push(PathBuf::from(format!(
            "{}-shm",
            base_path.to_string_lossy()
        )));
        files
    }

    if backup {
        // Create backup directory with timestamp
        use chrono::Local;
        let now = Local::now();
        let timestamp = now.format("%Y%m%d_%H%M%S").to_string();
        let backup_dir = home_dir.join(".ebb_backups").join(&timestamp);

        fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;

        // Backup databases and associated files if they exist
        for db_path in [&ebb_db_path, &monitor_db_path] {
            for file_path in get_db_files(db_path) {
                if file_path.exists() {
                    let file_name = file_path.file_name().unwrap();
                    let backup_path = backup_dir.join(file_name);
                    fs::copy(&file_path, &backup_path).map_err(|e| e.to_string())?;
                    log::info!("Backed up {:?} to {:?}", file_path, backup_path);
                }
            }
        }
    }

    // Remove existing databases and associated files
    for db_path in [&ebb_db_path, &monitor_db_path] {
        for file_path in get_db_files(db_path) {
            if file_path.exists() {
                fs::remove_file(&file_path).map_err(|e| e.to_string())?;
                log::info!("Removed {:?}", file_path);
            }
        }
    }

    Ok("App data reset successfully".to_string())
}

#[command]
pub fn restore_app_data_from_backup() -> Result<String, String> {
    use std::path::{Path, PathBuf};

    let home_dir = dirs::home_dir().expect("Could not find home directory");
    let backups_dir = home_dir.join(".ebb_backups");

    if !backups_dir.exists() {
        return Err("No backups found".to_string());
    }

    // Find the most recent backup directory
    let mut latest_backup: Option<(PathBuf, std::time::SystemTime)> = None;

    for entry in fs::read_dir(&backups_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.is_dir() {
            if let Ok(metadata) = fs::metadata(&path) {
                if let Ok(modified) = metadata.modified() {
                    if latest_backup.is_none() || modified > latest_backup.as_ref().unwrap().1 {
                        latest_backup = Some((path, modified));
                    }
                }
            }
        }
    }

    let latest_backup_dir = match latest_backup {
        Some((dir, _)) => dir,
        None => return Err("No backup directories found".to_string()),
    };

    // Helper function to restore files
    fn restore_file(backup_path: &Path, target_path: &Path) -> Result<(), String> {
        if backup_path.exists() {
            // Ensure parent directory exists
            if let Some(parent) = target_path.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }

            fs::copy(backup_path, target_path).map_err(|e| e.to_string())?;
            log::info!("Restored {:?} to {:?}", backup_path, target_path);
        }
        Ok(())
    }

    // Restore Ebb database
    let ebb_db_name = "ebb-desktop.sqlite";
    let ebb_db_backup = latest_backup_dir.join(ebb_db_name);
    let ebb_db_target = home_dir.join(".ebb").join(ebb_db_name);

    restore_file(&ebb_db_backup, &ebb_db_target)?;
    restore_file(
        &latest_backup_dir.join(format!("{}-wal", ebb_db_name)),
        &Path::new(&format!("{}-wal", ebb_db_target.to_string_lossy())),
    )?;
    restore_file(
        &latest_backup_dir.join(format!("{}-shm", ebb_db_name)),
        &Path::new(&format!("{}-shm", ebb_db_target.to_string_lossy())),
    )?;

    // Restore CodeClimbers database
    let cc_db_name = "codeclimbers-desktop.sqlite";
    let cc_db_backup = latest_backup_dir.join(cc_db_name);
    let cc_db_target = home_dir.join(".codeclimbers").join(cc_db_name);

    restore_file(&cc_db_backup, &cc_db_target)?;
    restore_file(
        &latest_backup_dir.join(format!("{}-wal", cc_db_name)),
        &Path::new(&format!("{}-wal", cc_db_target.to_string_lossy())),
    )?;
    restore_file(
        &latest_backup_dir.join(format!("{}-shm", cc_db_name)),
        &Path::new(&format!("{}-shm", cc_db_target.to_string_lossy())),
    )?;

    Ok(format!(
        "App data restored from backup: {:?}",
        latest_backup_dir
    ))
}

#[command]
pub fn detect_spotify() -> bool {
    #[cfg(target_os = "macos")]
    {
        std::path::Path::new("/Applications/Spotify.app").exists()
    }
    #[cfg(target_os = "windows")]
    {
        let program_files = std::env::var("PROGRAMFILES").unwrap_or_default();
        let program_files_x86 = std::env::var("PROGRAMFILES(X86)").unwrap_or_default();
        std::path::Path::new(&format!("{}/Spotify/Spotify.exe", program_files)).exists()
            || std::path::Path::new(&format!("{}/Spotify/Spotify.exe", program_files_x86)).exists()
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("which")
            .arg("spotify")
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false)
    }
}

#[command]
pub fn get_mac_address() -> Result<String, String> {
    match mac_address::get_mac_address() {
        Ok(Some(addr)) => {
            println!("Found MAC address: {}", addr);
            Ok(addr.to_string())
        },
        Ok(None) => Err("No MAC address found on this device".to_string()),
        Err(e) => {
            println!("Error getting MAC address: {}", e);
            Err(format!("Failed to get MAC address: {}", e))
        }
    }
}
