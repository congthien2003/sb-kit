const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { createTracker } = require("./core");

function json(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}
function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024)
        reject(new Error("Request body is too large."));
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
    request.on("error", reject);
  });
}

async function startServer({ root, host = "127.0.0.1", port = 41737 } = {}) {
  if (!["127.0.0.1", "localhost"].includes(host))
    throw new Error("Tracker server must bind to loopback.");
  const tracker = createTracker({ root });
  const ui = path.join(__dirname, "ui");
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      const match = (regex) => url.pathname.match(regex);
      let result;
      if (request.method === "GET" && url.pathname === "/api/summary")
        result = tracker.dailySummary(url.searchParams.get("date") || "today");
      else if (request.method === "GET" && url.pathname === "/api/sessions")
        result = tracker.listSessions({
          date: url.searchParams.get("date") || "today",
          archived: url.searchParams.get("archived") === "true",
        });
      else if (request.method === "POST" && url.pathname === "/api/sessions")
        return json(
          response,
          201,
          tracker.createSession(await readBody(request)),
        );
      else if (request.method === "GET" && match(/^\/api\/sessions\/(\d+)$/))
        result = tracker.getSession(
          Number(match(/^\/api\/sessions\/(\d+)$/)[1]),
        );
      else if (request.method === "PATCH" && match(/^\/api\/sessions\/(\d+)$/))
        result = tracker.updateSession(
          Number(match(/^\/api\/sessions\/(\d+)$/)[1]),
          await readBody(request),
        );
      else if (
        request.method === "POST" &&
        match(/^\/api\/sessions\/(\d+)\/archive$/)
      )
        result = tracker.archiveSession(
          Number(match(/^\/api\/sessions\/(\d+)\/archive$/)[1]),
          (await readBody(request)).actor,
        );
      else if (request.method === "POST" && url.pathname === "/api/tasks")
        return json(response, 201, tracker.createTask(await readBody(request)));
      else if (request.method === "GET" && match(/^\/api\/tasks\/(\d+)$/))
        result = tracker.getTask(Number(match(/^\/api\/tasks\/(\d+)$/)[1]));
      else if (request.method === "PATCH" && match(/^\/api\/tasks\/(\d+)$/))
        result = tracker.updateTask(
          Number(match(/^\/api\/tasks\/(\d+)$/)[1]),
          await readBody(request),
        );
      else if (request.method === "GET" && url.pathname === "/api/artifacts")
        result = tracker.listArtifacts(
          Number(url.searchParams.get("sessionId")),
        );
      else if (request.method === "POST" && url.pathname === "/api/artifacts")
        return json(
          response,
          201,
          tracker.addArtifact(await readBody(request)),
        );
      else if (request.method === "GET" && match(/^\/api\/artifacts\/(\d+)$/))
        result = tracker.getArtifact(
          Number(match(/^\/api\/artifacts\/(\d+)$/)[1]),
        );
      else if (request.method === "GET" && match(/^\/api\/handoff\/(\d+)$/))
        result = {
          prompt: tracker.handoff(Number(match(/^\/api\/handoff\/(\d+)$/)[1])),
        };
      else {
        const files = {
          "/": ["index.html", "text/html"],
          "/app.js": ["app.js", "text/javascript"],
          "/styles.css": ["styles.css", "text/css"],
        };
        if (!files[url.pathname])
          return json(response, 404, { error: { message: "Not found." } });
        const [file, type] = files[url.pathname];
        response.writeHead(200, { "content-type": `${type}; charset=utf-8` });
        return response.end(fs.readFileSync(path.join(ui, file)));
      }
      json(response, 200, result);
    } catch (error) {
      json(response, 400, { error: { message: error.message } });
    }
  });
  await new Promise((resolve, reject) =>
    server.once("error", reject).listen(port, host, resolve),
  );
  const address = server.address();
  return {
    url: `http://${host}:${address.port}`,
    close: () =>
      new Promise((resolve) =>
        server.close(() => {
          tracker.close();
          resolve();
        }),
      ),
  };
}

module.exports = { startServer };
