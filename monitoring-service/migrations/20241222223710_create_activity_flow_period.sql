CREATE TABLE IF NOT EXISTS activity_flow_period (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    score REAL NOT NULL,
    app_switches INTEGER NOT NULL,
    inactive_time INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);