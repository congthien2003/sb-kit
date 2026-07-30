const migrations = [
  {
    version: 1,
    sql: `
    CREATE TABLE sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL, updated_by TEXT NOT NULL, created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL, archived_at TEXT
    );
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
      title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      acceptance_criteria TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','blocked','done')),
      blocked_reason TEXT, completed_at TEXT, position INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL, updated_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
      type TEXT NOT NULL CHECK (type IN ('spec','implementation_plan','doc')),
      key TEXT NOT NULL, title TEXT NOT NULL, version INTEGER NOT NULL, path TEXT NOT NULL,
      created_by TEXT NOT NULL, created_at TEXT NOT NULL,
      UNIQUE(session_id,key,version)
    );
    CREATE TABLE activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, entity_type TEXT NOT NULL, entity_id INTEGER NOT NULL,
      action TEXT NOT NULL, actor TEXT NOT NULL, from_status TEXT, to_status TEXT,
      details_json TEXT, created_at TEXT NOT NULL
    );
    CREATE INDEX tasks_session_position_idx ON tasks(session_id,position,id);
    CREATE INDEX artifacts_session_key_version_idx ON artifacts(session_id,key,version DESC);
    CREATE INDEX activity_entity_idx ON activity_log(entity_type,entity_id,created_at);
  `,
  },
];

module.exports = { migrations };
