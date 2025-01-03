use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum MouseEventType {
    Move,
    LeftDown,
    LeftUp,
    RightDown,
    RightUp,
    MiddleDown,
    MiddleUp,
    Scroll,
}

impl TryFrom<i32> for MouseEventType {
    type Error = &'static str;

    fn try_from(value: i32) -> Result<Self, Self::Error> {
        match value {
            0 => Ok(MouseEventType::Move),
            1 => Ok(MouseEventType::LeftDown),
            2 => Ok(MouseEventType::LeftUp),
            3 => Ok(MouseEventType::RightDown),
            4 => Ok(MouseEventType::RightUp),
            5 => Ok(MouseEventType::MiddleDown),
            6 => Ok(MouseEventType::MiddleUp),
            7 => Ok(MouseEventType::Scroll),
            _ => Err("Invalid mouse event type"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum WindowEventType {
    Focused,
    TitleChanged,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MouseEvent {
    pub x: f64,
    pub y: f64,
    pub event_type: MouseEventType,
    pub scroll_delta: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyboardEvent {
    pub key_code: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowEvent {
    pub app_name: String,
    pub title: String,
}

pub trait EventCallback: Send + Sync {
    fn on_mouse_events(&self, events: Vec<MouseEvent>);
    fn on_keyboard_events(&self, events: Vec<KeyboardEvent>);
    fn on_window_event(&self, event: WindowEvent);
}
