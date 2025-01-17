#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
pub(crate) use macos::*;

#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
pub(crate) use windows::*;

use crate::{event::EventCallback, MonitorError};
use std::sync::Arc;

pub fn detect_changes() -> Result<(), MonitorError> {
    platform_detect_changes()
}

pub fn initialize_callback(callback: Arc<dyn EventCallback>) -> Result<(), MonitorError> {
    platform_initialize_callback(callback)
}
