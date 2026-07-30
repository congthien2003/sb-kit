const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const { migrations } = require("./migrations");

const databasePath = (root) => path.join(root, ".sb-kit", "tracker.sqlite");

function openDatabase(root) {
  const db = new Database(databasePath(root));
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  return db;
}

function initializeDatabase(root, migrationList = migrations) {
  fs.mkdirSync(path.dirname(databasePath(root)), { recursive: true });
  const existed = fs.existsSync(databasePath(root));
  const db = openDatabase(root);
  const table = db
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_migrations'",
    )
    .get();
  const applied = new Set(
    table
      ? db
          .prepare("SELECT version FROM schema_migrations")
          .all()
          .map((x) => x.version)
      : [],
  );
  const pending = migrationList.filter((x) => !applied.has(x.version));
  if (existed && pending.length) {
    db.pragma("wal_checkpoint(TRUNCATE)");
    fs.copyFileSync(databasePath(root), `${databasePath(root)}.bak`);
  }
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)",
  );
  db.transaction(() => {
    for (const migration of pending) {
      db.exec(migration.sql);
      db.prepare("INSERT INTO schema_migrations VALUES (?,?)").run(
        migration.version,
        new Date().toISOString(),
      );
    }
  })();
  return db;
}

module.exports = { databasePath, initializeDatabase, openDatabase };
