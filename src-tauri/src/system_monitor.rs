use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::SystemTime;

use os_monitor::{
    detect_changes, has_accessibility_permissions, initialize_monitor,
    request_accessibility_permissions, Monitor,
};
use os_monitor_service::initialize_monitoring_service;

use tauri::async_runtime;
use tauri::AppHandle;
use tokio::time::{sleep, Duration};

// Shared counter for main thread operations
static LAST_MAIN_THREAD_COMPLETION: AtomicU64 = AtomicU64::new(0);

pub fn get_default_db_path() -> String {
    let home_dir = dirs::home_dir().expect("Could not find home directory");
    home_dir
        .join(".codeclimbers")
        .join("codeclimbers-desktop.sqlite")
        .to_str()
        .expect("Invalid path")
        .to_string()
}

pub fn start_monitoring(app: AppHandle) {
    log::info!("Starting monitoring service...");

    // Start heartbeat monitoring in a separate task
    let has_permissions = has_accessibility_permissions();
    println!("has_permissions: {}", has_permissions);
    if !has_permissions {
        let request_permissions = request_accessibility_permissions();
        println!("request_permissions: {}", request_permissions);
    }
    start_heartbeat_monitor();

    async_runtime::spawn(async move {
        log::info!("Initializing monitor in async runtime...");
        let db_path = get_default_db_path();
        let monitor = Arc::new(Monitor::new());
        initialize_monitor(monitor.clone()).expect("Failed to initialize monitor");
        initialize_monitoring_service(monitor.clone(), db_path).await;
        log::info!("Monitor initialized");

        loop {
            log::info!("Monitor loop iteration starting");
            sleep(Duration::from_secs(1)).await;
            let start = std::time::Instant::now();

            let _ = app
                .run_on_main_thread(move || {
                    log::info!("Executing on main thread");
                    let result = detect_changes();
                    log::info!("Main thread execution completed in {:?}", start.elapsed());

                    // Only update completion time after successful main thread operation
                    update_main_thread_completion();

                    result.expect("Failed to detect changes");
                })
                .unwrap_or_else(|e| {
                    log::error!("Failed to run on main thread: {}", e);
                    panic!("Failed to run on main thread: {}", e);
                });

            log::info!("Monitor loop iteration completed");
        }
    });
}

fn update_main_thread_completion() {
    LAST_MAIN_THREAD_COMPLETION.store(
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
        Ordering::SeqCst,
    );
}

fn start_heartbeat_monitor() {
    // Spawn a dedicated OS thread for monitoring
    thread::Builder::new()
        .name("heartbeat-monitor".into())
        .spawn(move || {
            const HEARTBEAT_CHECK_INTERVAL: Duration = Duration::from_secs(5);
            const MAIN_THREAD_TIMEOUT: Duration = Duration::from_secs(10);

            loop {
                thread::sleep(HEARTBEAT_CHECK_INTERVAL);

                let last_completion = LAST_MAIN_THREAD_COMPLETION.load(Ordering::SeqCst);
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs();

                if now - last_completion > MAIN_THREAD_TIMEOUT.as_secs() {
                    log::error!(
                        "WARNING: Main thread operation timeout detected! Last completion: {}s ago",
                        now - last_completion
                    );

                    // Log to a file since stderr might be blocked
                    log::error!(
                        "Main thread timeout detected at {}. Last completion: {}s ago",
                        now,
                        now - last_completion
                    );

                    // Attempt recovery in a separate thread to avoid being blocked
                    attempt_recovery();
                }
            }
        })
        .expect("Failed to spawn heartbeat monitor thread");
}

fn attempt_recovery() {
    // Spawn a new thread for recovery to avoid being blocked by the main thread
    thread::Builder::new()
        .name("recovery-worker".into())
        .spawn(move || {
            log::error!("Attempting monitoring service recovery...");

            // 1. Log system state
            log_system_state();

            // 2. Attempt to generate thread dump
            generate_thread_dump();

            // 3. Consider forcefully terminating the application
            restart_application();
            // This is a last resort option that should be carefully considered
            if cfg!(debug_assertions) {
                log::error!("In debug mode: would terminate application here");
            } else {
                // std::process::exit(1); // Enable if you want to force quit
            }
        })
        .expect("Failed to spawn recovery thread");
}

fn restart_application() {
    log::info!("Initiating application restart...");
    if let Ok(current_exe) = std::env::current_exe() {
        log::info!("Current executable path: {}", current_exe.display());

        log::info!(
            "Arguments: {}",
            std::env::args().skip(1).collect::<Vec<String>>().join(" ")
        );
        match std::process::Command::new(current_exe)
            .args(std::env::args().skip(1))
            .arg("--restarted")
            .spawn()
        {
            Ok(_) => {
                log::error!("Successfully spawned new instance.");
                thread::sleep(Duration::from_secs(1));
                std::process::exit(0);
            }
            Err(e) => {
                log::error!("Failed to restart application: {}", e);
            }
        }
    } else {
        log::error!("Failed to get current executable path");
    }
    log::error!("Restarting application failed");
}

fn log_system_state() {
    let state = format!(
        "System State:\n\
        Time: {}\n\
        Current Thread: {:?}\n\
        Memory Usage: {:?}\n",
        SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
        std::thread::current().id(),
        get_memory_usage()
    );
    log::info!("{}", state);
}

fn generate_thread_dump() {
    // This is a placeholder - actual thread dump implementation
    // would be platform-specific
    #[cfg(target_os = "linux")]
    {
        if let Ok(pid) = std::process::id() {
            let _ = std::process::Command::new("kill")
                .args(["-3", &pid.to_string()])
                .output();
        }
    }
    #[cfg(target_os = "macos")]
    {
        let pid = std::process::id();
        let _ = std::process::Command::new("kill")
            .args(["-SIGINFO", &pid.to_string()])
            .output();
    }
}

fn get_memory_usage() -> Option<String> {
    // Platform-specific memory usage information
    #[cfg(target_os = "linux")]
    {
        if let Ok(contents) = std::fs::read_to_string("/proc/self/status") {
            return Some(contents);
        }
    }
    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = std::process::Command::new("ps")
            .args(["o", "rss=", "-p", &std::process::id().to_string()])
            .output()
        {
            if let Ok(memory) = String::from_utf8(output.stdout) {
                return Some(format!("Memory (RSS): {} KB", memory.trim()));
            }
        }
    }
    None
}
