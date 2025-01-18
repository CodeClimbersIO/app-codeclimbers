use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_db_path() -> String {
    let home_dir = dirs::home_dir().expect("Could not find home directory");
    home_dir
        .join(".ebb")
        .join("ebb-desktop-new.sqlite")
        .to_str()
        .expect("Invalid path")
        .to_string()
}

pub fn get_migrations() -> Vec<Migration> {
    println!("get_migrations");
    vec![
        Migration {
            version: 1,
            description: "create_flow_session",
            sql: r#"
          CREATE TABLE IF NOT EXISTS flow_session (
              id TEXT PRIMARY KEY NOT NULL,
              objective TEXT NOT NULL,
              self_score REAL,
              start DATETIME NOT NULL,
              end DATETIME
          );"#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_flow_period",
            sql: r#"
            CREATE TABLE IF NOT EXISTS flow_period (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP NOT NULL,
                score REAL NOT NULL,
                details TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );"#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_stats_to_flow_session",
            sql: r#"
            ALTER TABLE flow_session
            ADD COLUMN stats TEXT NOT NULL DEFAULT '{}';"#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_previous_flow_period_id_to_flow_period",
            sql: r#"
            ALTER TABLE flow_period
            ADD COLUMN previous_flow_period_id INTEGER;
            CREATE UNIQUE INDEX idx_previous_flow_period
            ON flow_period(previous_flow_period_id)
            WHERE previous_flow_period_id IS NOT NULL;
            "#,
            kind: MigrationKind::Up,
        },
    ]
}
