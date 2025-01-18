use sqlx::{sqlite::SqlitePool, Pool, Sqlite};

pub struct DbManager {
    pub pool: Pool<Sqlite>,
}

pub fn get_db_path() -> String {
    let home_dir = dirs::home_dir().expect("Could not find home directory");
    home_dir
        .join(".codeclimbers")
        .join("codeclimbers-desktop-new.sqlite")
        .to_str()
        .expect("Invalid path")
        .to_string()
}

#[cfg(test)]
pub fn get_test_db_path() -> String {
    let home_dir = dirs::home_dir().expect("Could not find home directory");
    home_dir
        .join(".codeclimbers")
        .join("codeclimbers-desktop-test.sqlite")
        .to_str()
        .expect("Invalid path")
        .to_string()
}

#[cfg(test)]
pub async fn create_test_db() -> SqlitePool {
    use sqlx::sqlite::SqlitePoolOptions;
    // let db_path = get_test_db_path();
    let db_path = ":memory:";
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&format!("sqlite:{db_path}"))
        .await
        .unwrap();

    set_wal_mode(&pool).await.unwrap();
    sqlx::migrate!().run(&pool).await.unwrap();

    pool
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
        sqlx::migrate!().run(&pool).await?;

        Ok(Self { pool })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_db_manager() {
        let db_path = get_test_db_path();
        let db_manager = DbManager::new(&db_path).await.unwrap();
        let result: Result<i32, _> = sqlx::query_scalar("SELECT 1")
            .fetch_one(&db_manager.pool)
            .await;
        assert_eq!(result.unwrap(), 1);
    }

    #[tokio::test]
    async fn test_migrations() {
        let _ = create_test_db().await;
    }
}
