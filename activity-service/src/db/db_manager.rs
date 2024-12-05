use sqlx::{sqlite::SqlitePool, Pool, Sqlite};

pub struct DbManager {
    pub pool: Pool<Sqlite>,
}

pub fn get_db_path() -> String {
    let home_dir = dirs::home_dir().expect("Could not find home directory");
    home_dir
        .join(".codeclimbers")
        .join("codeclimbers-desktop.sqlite")
        .to_str()
        .expect("Invalid path")
        .to_string()
}

async fn set_wal_mode(pool: &sqlx::SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query("PRAGMA journal_mode=WAL;")
        .execute(pool)
        .await?;
    Ok(())
}

impl DbManager {
    pub async fn new(db_path: &str) -> Result<Self, sqlx::Error> {
        let database_url = format!("sqlite:{db_path}");

        let path = std::path::Path::new(db_path);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| sqlx::Error::Configuration(Box::new(e)))?;
        }
        println!("database_url: {}", database_url);

        // Debug information
        println!("Attempting to open/create database at: {}", db_path);

        match std::fs::OpenOptions::new()
            .create(true)
            .write(true)
            .open(db_path)
        {
            Ok(_) => println!("Successfully created/opened database file"),
            Err(e) => println!("Error creating/opening database file: {}", e),
        }

        let pool = SqlitePool::connect(&database_url).await?;

        set_wal_mode(&pool).await?;
        sqlx::migrate!("src/db/migrations").run(&pool).await?;

        Ok(Self { pool })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn create_test_db() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();

        sqlx::migrate!("src/db/migrations")
            .run(&pool)
            .await
            .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_migrations() {
        let _ = create_test_db().await;
    }

    #[tokio::test]
    async fn test_db_manager() {
        let db_path = get_db_path();
        let db_manager = DbManager::new(&db_path).await.unwrap();
        // query with pool
        let result: Result<i32, _> = sqlx::query_scalar("SELECT 1")
            .fetch_one(&db_manager.pool)
            .await;
        println!("result:{:?}", result);
    }
}
