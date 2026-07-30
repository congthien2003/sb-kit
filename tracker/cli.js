const { initializeRepository, findTrackerRoot } = require("./repository");
const { initializeDatabase } = require("./database");
const { createTracker } = require("./core");

function parseArguments(argv) {
  const positionals = [];
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) positionals.push(argv[i]);
    else {
      const key = argv[i]
        .slice(2)
        .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      options[key] =
        argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    }
  }
  return { positionals, options };
}

function required(value, name) {
  if (value === undefined || value === "")
    throw new Error(`${name} is required.`);
  return value;
}

function print(value, json) {
  process.stdout.write(
    json
      ? `${JSON.stringify(value)}\n`
      : `${typeof value === "string" ? value : JSON.stringify(value, null, 2)}\n`,
  );
}

async function run(argv) {
  const { positionals: p, options: o } = parseArguments(argv);
  try {
    if (p[0] === "init") {
      const root = initializeRepository();
      initializeDatabase(root).close();
      print({ root, database: ".sb-kit/tracker.sqlite" }, o.json);
      return;
    }
    const root = findTrackerRoot();
    if (p[0] === "serve") {
      const { startServer } = require("./server");
      const server = await startServer({ root });
      print({ url: server.url }, o.json);
      return;
    }
    if (p[0] === "mcp") {
      await require("./mcp").runMcp(root);
      return;
    }
    const tracker = createTracker({ root });
    try {
      let result;
      if (p[0] === "session" && p[1] === "create")
        result = tracker.createSession({
          title: required(o.title, "title"),
          summary: o.summary,
          actor: o.actor,
        });
      else if (p[0] === "session" && p[1] === "list")
        result = tracker.listSessions({ date: o.date, archived: o.archived });
      else if (p[0] === "session" && p[1] === "show")
        result = tracker.getSession(Number(p[2]));
      else if (p[0] === "session" && p[1] === "update")
        result = tracker.updateSession(Number(p[2]), {
          title: o.title,
          summary: o.summary,
          actor: o.actor,
        });
      else if (p[0] === "session" && p[1] === "archive")
        result = tracker.archiveSession(Number(p[2]), o.actor);
      else if (p[0] === "task" && p[1] === "create")
        result = tracker.createTask({
          sessionId: Number(required(o.session, "session")),
          title: required(o.title, "title"),
          description: o.description,
          acceptanceCriteria: o.acceptanceCriteria,
          actor: o.actor,
        });
      else if (p[0] === "task" && p[1] === "list")
        result = tracker.listTasks(Number(required(o.session, "session")));
      else if (p[0] === "task" && p[1] === "show")
        result = tracker.getTask(Number(p[2]));
      else if (p[0] === "task" && p[1] === "update")
        result = tracker.updateTask(Number(p[2]), {
          title: o.title,
          description: o.description,
          acceptanceCriteria: o.acceptanceCriteria,
          status: o.status,
          blockedReason: o.reason,
          position: o.position === undefined ? undefined : Number(o.position),
          actor: o.actor,
        });
      else if (p[0] === "artifact" && p[1] === "add")
        result = tracker.addArtifact({
          sessionId: Number(required(o.session, "session")),
          type: required(o.type, "type"),
          key: required(o.key, "key"),
          title: o.title,
          path: required(o.path, "path"),
          actor: o.actor,
        });
      else if (p[0] === "artifact" && p[1] === "list")
        result = tracker.listArtifacts(Number(required(o.session, "session")));
      else if (p[0] === "artifact" && p[1] === "show")
        result = tracker.getArtifact(Number(p[2]));
      else if (p[0] === "handoff") result = tracker.handoff(Number(p[1]));
      else if (p[0] === "summary") result = tracker.dailySummary(o.date);
      else throw new Error("Unknown tracker command.");
      print(result, o.json);
    } finally {
      tracker.close();
    }
  } catch (error) {
    process.exitCode = 1;
    if (o.json)
      process.stderr.write(
        `${JSON.stringify({ error: { message: error.message } })}\n`,
      );
    else process.stderr.write(`Error: ${error.message}\n`);
  }
}

module.exports = { parseArguments, run };
