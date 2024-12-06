CREATE TABLE activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('WINDOW', 'MOUSE', 'KEYBOARD')),
    app_name TEXT,
    app_window_title TEXT,
    mouse_x INTEGER,
    mouse_y INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
