import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const getDb = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('spending.db');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        location TEXT,
        image TEXT,
        isFavorite INTEGER DEFAULT 0
      );
    `);
    const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM transactions');
    // Auto-seeding removed to test Empty State.
    // if (result && result.count === 0) { ... }
  }
  return db;
};
