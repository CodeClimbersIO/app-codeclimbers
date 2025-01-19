use std::thread;

pub fn log(message: &str) {
    let thread_name = thread::current().name().unwrap_or("unnamed").to_string();
    println!("\x1B[34m{}\x1B[0m: {}", thread_name, message);
}
