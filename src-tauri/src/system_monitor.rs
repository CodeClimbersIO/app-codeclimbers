use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::SystemTime;

use tauri::async_runtime;
use tauri::AppHandle;
use tokio::time::{sleep, Duration};

// Shared counter for main thread operations
static LAST_MAIN_THREAD_COMPLETION: AtomicU64 = AtomicU64::new(0);

pub fn start_monitoring(app: AppHandle) {
    println!("Starting monitoring service...");

    // Start heartbeat monitoring in a separate task
    start_heartbeat_monitor(app.clone());

    async_runtime::spawn(async move {
        println!("Initializing monitor in async runtime...");
        monitoring_service::initialize_monitor().await;
        println!("Monitor initialized");

        loop {
            println!("Monitor loop iteration starting");
            sleep(Duration::from_secs(1)).await;
            let start = std::time::Instant::now();

            let _ = app.run_on_main_thread(move || {
                println!("Executing on main thread");
                let result = monitoring_service::detect_changes();
                println!("Main thread execution completed in {:?}", start.elapsed());

                // Only update completion time after successful main thread operation
                update_main_thread_completion();

                result.expect("Failed to detect changes");
            });

            println!("Monitor loop iteration completed");
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

fn start_heartbeat_monitor(app: AppHandle) {
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
                    eprintln!(
                        "WARNING: Main thread operation timeout detected! Last completion: {}s ago",
                        now - last_completion
                    );

                    // Log to a file since stderr might be blocked
                    log_error_to_file(&format!(
                        "Main thread timeout detected at {}. Last completion: {}s ago",
                        now,
                        now - last_completion
                    ));

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
            eprintln!("Attempting monitoring service recovery...");

            // 1. Log system state
            log_system_state();

            // 2. Attempt to generate thread dump
            generate_thread_dump();

            // 3. Consider forcefully terminating the application
            // This is a last resort option that should be carefully considered
            if cfg!(debug_assertions) {
                eprintln!("In debug mode: would terminate application here");
            } else {
                // std::process::exit(1); // Enable if you want to force quit
            }
        })
        .expect("Failed to spawn recovery thread");
}

fn log_error_to_file(message: &str) {
    use std::fs::OpenOptions;
    use std::io::Write;

    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open("monitor_errors.log")
    {
        let timestamp = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        if writeln!(file, "[{}] {}", timestamp, message).is_err() {
            eprintln!("Failed to write to error log file");
        }
    }
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
    log_error_to_file(&state);
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

/// Simulates blocking the main thread for the specified duration in seconds
#[tauri::command]
pub fn simulate_main_thread_block(seconds: u64) {
    println!("Blocking main thread for {} seconds...", seconds);
    thread::sleep(Duration::from_secs(seconds));
    println!("Main thread block completed");
}
