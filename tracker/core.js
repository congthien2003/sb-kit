const { openDatabase } = require("./database");
const { buildHandoff } = require("./handoff");
const { resolveArtifactPath } = require("./repository");

const TRANSITIONS = {
  todo: new Set(["in_progress"]),
  in_progress: new Set(["blocked", "done"]),
  blocked: new Set(["in_progress"]),
  done: new Set(["in_progress"]),
};

function required(value, name) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${name} is required.`);
  return normalized;
}

function actorName(value) {
  return String(value || "unknown").trim() || "unknown";
}

function mapSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    counts:
      row.total == null
        ? undefined
        : {
            todo: row.todo,
            inProgress: row.in_progress,
            blocked: row.blocked,
            done: row.done,
            total: row.total,
          },
  };
}

function mapTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    title: row.title,
    description: row.description,
    acceptanceCriteria: row.acceptance_criteria,
    status: row.status,
    blockedReason: row.blocked_reason,
    completedAt: row.completed_at,
    position: row.position,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapArtifact(row) {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    type: row.type,
    key: row.key,
    title: row.title,
    version: row.version,
    path: row.path,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function dateRange(value, now) {
  const current = new Date(now);
  let target;
  if (!value || value === "today") {
    target = current;
  } else if (value === "yesterday") {
    target = new Date(
      current.getFullYear(),
      current.getMonth(),
      current.getDate() - 1,
    );
  } else {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match)
      throw new Error("Date must be today, yesterday, or YYYY-MM-DD.");
    target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (
      target.getFullYear() !== Number(match[1]) ||
      target.getMonth() !== Number(match[2]) - 1 ||
      target.getDate() !== Number(match[3])
    ) {
      throw new Error("Date is invalid.");
    }
  }
  const start = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  const end = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate() + 1,
  );
  const key = [
    start.getFullYear(),
    String(start.getMonth() + 1).padStart(2, "0"),
    String(start.getDate()).padStart(2, "0"),
  ].join("-");
  return { key, start: start.toISOString(), end: end.toISOString() };
}

function createTracker({ root, now = () => new Date() }) {
  const db = openDatabase(root);
  const timestamp = () => new Date(now()).toISOString();

  function activity(entityType, entityId, action, actor, extra = {}) {
    db.prepare(
      `
      INSERT INTO activity_log(
        entity_type, entity_id, action, actor, from_status, to_status, details_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      entityType,
      entityId,
      action,
      actorName(actor),
      extra.fromStatus || null,
      extra.toStatus || null,
      extra.details ? JSON.stringify(extra.details) : null,
      timestamp(),
    );
  }

  function getSession(id) {
    const row = db
      .prepare("SELECT * FROM sessions WHERE id = ?")
      .get(Number(id));
    if (!row) throw new Error(`Session ${id} was not found.`);
    return mapSession(row);
  }

  function createSession(input) {
    const title = required(input.title, "Session title");
    const actor = actorName(input.actor);
    const createdAt = timestamp();
    const insert = db.transaction(() => {
      const result = db
        .prepare(
          `
        INSERT INTO sessions(title, summary, created_by, updated_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        )
        .run(
          title,
          String(input.summary || ""),
          actor,
          actor,
          createdAt,
          createdAt,
        );
      activity("session", result.lastInsertRowid, "session.created", actor);
      return Number(result.lastInsertRowid);
    });
    return getSession(insert());
  }

  function listSessions({ date = "today", archived = false } = {}) {
    const range = dateRange(date, now());
    const archiveClause = archived ? "" : "AND s.archived_at IS NULL";
    return db
      .prepare(
        `
      SELECT
        s.*,
        COUNT(t.id) AS total,
        COALESCE(SUM(t.status = 'todo'), 0) AS todo,
        COALESCE(SUM(t.status = 'in_progress'), 0) AS in_progress,
        COALESCE(SUM(t.status = 'blocked'), 0) AS blocked,
        COALESCE(SUM(t.status = 'done'), 0) AS done
      FROM sessions s
      LEFT JOIN tasks t ON t.session_id = s.id
      WHERE s.created_at >= ? AND s.created_at < ? ${archiveClause}
      GROUP BY s.id
      ORDER BY s.created_at DESC, s.id DESC
    `,
      )
      .all(range.start, range.end)
      .map(mapSession);
  }

  function updateSession(id, input) {
    const current = getSession(id);
    const actor = actorName(input.actor);
    const title =
      input.title === undefined
        ? current.title
        : required(input.title, "Session title");
    const summary =
      input.summary === undefined ? current.summary : String(input.summary);
    db.transaction(() => {
      db.prepare(
        `
        UPDATE sessions SET title = ?, summary = ?, updated_by = ?, updated_at = ? WHERE id = ?
      `,
      ).run(title, summary, actor, timestamp(), Number(id));
      activity("session", id, "session.updated", actor);
    })();
    return getSession(id);
  }

  function archiveSession(id, actor) {
    getSession(id);
    const normalizedActor = actorName(actor);
    const archivedAt = timestamp();
    db.transaction(() => {
      db.prepare(
        `
        UPDATE sessions
        SET archived_at = ?, updated_by = ?, updated_at = ?
        WHERE id = ?
      `,
      ).run(archivedAt, normalizedActor, archivedAt, Number(id));
      activity("session", id, "session.archived", normalizedActor);
    })();
    return getSession(id);
  }

  function getTask(id) {
    const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(Number(id));
    if (!row) throw new Error(`Task ${id} was not found.`);
    return mapTask(row);
  }

  function createTask(input) {
    getSession(input.sessionId);
    const title = required(input.title, "Task title");
    const actor = actorName(input.actor);
    const createdAt = timestamp();
    const position =
      input.position === undefined
        ? db
            .prepare(
              "SELECT COALESCE(MAX(position), -1) + 1 AS position FROM tasks WHERE session_id = ?",
            )
            .get(Number(input.sessionId)).position
        : Number(input.position);
    const insert = db.transaction(() => {
      const result = db
        .prepare(
          `
        INSERT INTO tasks(
          session_id, title, description, acceptance_criteria, position,
          created_by, updated_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        )
        .run(
          Number(input.sessionId),
          title,
          String(input.description || ""),
          String(input.acceptanceCriteria || ""),
          position,
          actor,
          actor,
          createdAt,
          createdAt,
        );
      activity("task", result.lastInsertRowid, "task.created", actor);
      return Number(result.lastInsertRowid);
    });
    return getTask(insert());
  }

  function listTasks(sessionId) {
    getSession(sessionId);
    return db
      .prepare(
        `
      SELECT * FROM tasks WHERE session_id = ? ORDER BY position, id
    `,
      )
      .all(Number(sessionId))
      .map(mapTask);
  }

  function updateTask(id, input) {
    const current = getTask(id);
    const actor = actorName(input.actor);
    const nextStatus = input.status || current.status;
    const statusChanged = nextStatus !== current.status;
    const requestedBlockedReason =
      input.blockedReason === undefined
        ? current.blockedReason
        : String(input.blockedReason).trim();
    if (!TRANSITIONS[nextStatus])
      throw new Error(`Unknown task status: ${nextStatus}.`);
    if (nextStatus === "blocked" && !requestedBlockedReason) {
      throw new Error("A blocked reason is required.");
    }
    if (statusChanged && !TRANSITIONS[current.status].has(nextStatus)) {
      throw new Error(
        `Invalid task transition: ${current.status} -> ${nextStatus}.`,
      );
    }

    const blockedReason =
      nextStatus === "blocked" ? requestedBlockedReason : null;
    const completedAt =
      nextStatus === "done"
        ? current.status === "done"
          ? current.completedAt
          : timestamp()
        : null;
    const title =
      input.title === undefined
        ? current.title
        : required(input.title, "Task title");
    const description =
      input.description === undefined
        ? current.description
        : String(input.description);
    const acceptanceCriteria =
      input.acceptanceCriteria === undefined
        ? current.acceptanceCriteria
        : String(input.acceptanceCriteria);
    const position =
      input.position === undefined ? current.position : Number(input.position);

    db.transaction(() => {
      db.prepare(
        `
        UPDATE tasks SET
          title = ?, description = ?, acceptance_criteria = ?, status = ?,
          blocked_reason = ?, completed_at = ?, position = ?, updated_by = ?, updated_at = ?
        WHERE id = ?
      `,
      ).run(
        title,
        description,
        acceptanceCriteria,
        nextStatus,
        blockedReason,
        completedAt,
        position,
        actor,
        timestamp(),
        Number(id),
      );
      activity(
        "task",
        id,
        statusChanged ? "task.status_changed" : "task.updated",
        actor,
        statusChanged
          ? { fromStatus: current.status, toStatus: nextStatus }
          : {},
      );
    })();
    return getTask(id);
  }

  function getArtifact(id) {
    const row = db
      .prepare("SELECT * FROM artifacts WHERE id = ?")
      .get(Number(id));
    if (!row) throw new Error(`Artifact ${id} was not found.`);
    const artifact = mapArtifact(row);
    const latest = db
      .prepare(
        `
      SELECT MAX(version) AS version FROM artifacts WHERE session_id = ? AND key = ?
    `,
      )
      .get(artifact.sessionId, artifact.key).version;
    return { ...artifact, latest: artifact.version === latest };
  }

  function addArtifact(input) {
    getSession(input.sessionId);
    const type = required(input.type, "Artifact type");
    if (!["spec", "implementation_plan", "doc"].includes(type)) {
      throw new Error(`Unknown artifact type: ${type}.`);
    }
    const key = required(input.key, "Artifact key");
    const title =
      input.title === undefined ? key : required(input.title, "Artifact title");
    resolveArtifactPath(root, input.path);
    const actor = actorName(input.actor);
    const createdAt = timestamp();
    const insert = db.transaction(() => {
      const version = db
        .prepare(
          `
        SELECT COALESCE(MAX(version), 0) + 1 AS version
        FROM artifacts WHERE session_id = ? AND key = ?
      `,
        )
        .get(Number(input.sessionId), key).version;
      const result = db
        .prepare(
          `
        INSERT INTO artifacts(
          session_id, type, key, title, version, path, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        )
        .run(
          Number(input.sessionId),
          type,
          key,
          title,
          version,
          String(input.path).replaceAll("\\", "/"),
          actor,
          createdAt,
        );
      activity("artifact", result.lastInsertRowid, "artifact.created", actor);
      return Number(result.lastInsertRowid);
    });
    return getArtifact(insert());
  }

  function listArtifacts(sessionId) {
    getSession(sessionId);
    const artifacts = db
      .prepare(
        `
      SELECT * FROM artifacts
      WHERE session_id = ?
      ORDER BY key, version DESC, id DESC
    `,
      )
      .all(Number(sessionId))
      .map(mapArtifact);
    const latestVersionByKey = new Map();
    for (const artifact of artifacts) {
      if (!latestVersionByKey.has(artifact.key)) {
        latestVersionByKey.set(artifact.key, artifact.version);
      }
    }
    return artifacts.map((artifact) => ({
      ...artifact,
      latest: artifact.version === latestVersionByKey.get(artifact.key),
    }));
  }

  function getActivity(entityType, entityId) {
    return db
      .prepare(
        `
      SELECT
        id,
        entity_type AS entityType,
        entity_id AS entityId,
        action,
        actor,
        from_status AS fromStatus,
        to_status AS toStatus,
        details_json AS detailsJson,
        created_at AS createdAt
      FROM activity_log
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY id
    `,
      )
      .all(entityType, Number(entityId))
      .map((row) => ({
        ...row,
        details: row.detailsJson ? JSON.parse(row.detailsJson) : null,
      }));
  }

  function dailySummary(date = "today") {
    const sessions = listSessions({ date });
    if (!sessions.length)
      return { date: dateRange(date, now()).key, sessions: [] };
    const ids = sessions.map((session) => session.id);
    const placeholders = ids.map(() => "?").join(",");
    const tasks = db
      .prepare(
        `
      SELECT * FROM tasks
      WHERE session_id IN (${placeholders})
      ORDER BY session_id, position, id
    `,
      )
      .all(...ids)
      .map(mapTask);
    const tasksBySession = new Map(ids.map((id) => [id, []]));
    for (const task of tasks) tasksBySession.get(task.sessionId).push(task);
    const artifacts = db
      .prepare(
        `
      SELECT * FROM artifacts
      WHERE session_id IN (${placeholders})
      ORDER BY session_id, key, version DESC, id DESC
    `,
      )
      .all(...ids)
      .map(mapArtifact);
    const artifactsBySession = new Map(ids.map((id) => [id, []]));
    const latestVersions = new Map();
    for (const artifact of artifacts) {
      const key = `${artifact.sessionId}:${artifact.key}`;
      if (!latestVersions.has(key)) latestVersions.set(key, artifact.version);
      artifactsBySession.get(artifact.sessionId).push({
        ...artifact,
        latest: artifact.version === latestVersions.get(key),
      });
    }
    return {
      date: dateRange(date, now()).key,
      sessions: sessions.map((session) => ({
        ...session,
        tasks: tasksBySession.get(session.id),
        artifacts: artifactsBySession.get(session.id),
      })),
    };
  }

  function handoff(taskId) {
    const task = getTask(taskId);
    return buildHandoff({
      root,
      session: getSession(task.sessionId),
      task,
      artifacts: listArtifacts(task.sessionId),
    });
  }

  return {
    createSession,
    listSessions,
    getSession,
    updateSession,
    archiveSession,
    createTask,
    listTasks,
    getTask,
    updateTask,
    addArtifact,
    listArtifacts,
    getArtifact,
    getActivity,
    dailySummary,
    handoff,
    close: () => {
      db.pragma("wal_checkpoint(TRUNCATE)");
      db.close();
    },
  };
}

module.exports = { createTracker };
