const { createTracker } = require("./core");

function createHandlers(tracker) {
  return {
    session_create: (x) => tracker.createSession(x),
    session_list: (x = {}) => tracker.listSessions(x),
    session_get: ({ id }) => tracker.getSession(id),
    session_update: ({ id, ...x }) => tracker.updateSession(id, x),
    session_archive: ({ id, actor }) => tracker.archiveSession(id, actor),
    task_create: (x) => tracker.createTask(x),
    task_list: ({ sessionId }) => tracker.listTasks(sessionId),
    task_get: ({ id }) => tracker.getTask(id),
    task_update: ({ id, ...x }) => tracker.updateTask(id, x),
    artifact_add: (x) => tracker.addArtifact(x),
    artifact_list: ({ sessionId }) => tracker.listArtifacts(sessionId),
    artifact_get: ({ id }) => tracker.getArtifact(id),
    handoff_get: ({ taskId }) => ({ prompt: tracker.handoff(taskId) }),
    daily_summary: ({ date } = {}) => tracker.dailySummary(date),
  };
}

async function runMcp(root) {
  const [{ McpServer }, { StdioServerTransport }, { z }] = await Promise.all([
    import("@modelcontextprotocol/sdk/server/mcp.js"),
    import("@modelcontextprotocol/sdk/server/stdio.js"),
    import("zod"),
  ]);
  const tracker = createTracker({ root });
  const handlers = createHandlers(tracker);
  const server = new McpServer({ name: "sb-kit-tracker", version: "1.0.0" });
  const schemas = {
    session_create: {
      title: z.string(),
      summary: z.string().optional(),
      actor: z.string().optional(),
    },
    session_list: {
      date: z.string().optional(),
      archived: z.boolean().optional(),
    },
    session_get: { id: z.number() },
    session_update: {
      id: z.number(),
      title: z.string().optional(),
      summary: z.string().optional(),
      actor: z.string().optional(),
    },
    session_archive: { id: z.number(), actor: z.string().optional() },
    task_create: {
      sessionId: z.number(),
      title: z.string(),
      description: z.string().optional(),
      acceptanceCriteria: z.string().optional(),
      actor: z.string().optional(),
    },
    task_list: { sessionId: z.number() },
    task_get: { id: z.number() },
    task_update: {
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      acceptanceCriteria: z.string().optional(),
      status: z.enum(["todo", "in_progress", "blocked", "done"]).optional(),
      blockedReason: z.string().optional(),
      actor: z.string().optional(),
    },
    artifact_add: {
      sessionId: z.number(),
      type: z.enum(["spec", "implementation_plan", "doc"]),
      key: z.string(),
      title: z.string().optional(),
      path: z.string(),
      actor: z.string().optional(),
    },
    artifact_list: { sessionId: z.number() },
    artifact_get: { id: z.number() },
    handoff_get: { taskId: z.number() },
    daily_summary: { date: z.string().optional() },
  };
  for (const [name, handler] of Object.entries(handlers)) {
    server.registerTool(
      name,
      { description: `sb-kit tracker ${name}`, inputSchema: schemas[name] },
      async (input) => {
        try {
          const value = await handler(input);
          return { content: [{ type: "text", text: JSON.stringify(value) }] };
        } catch (error) {
          return {
            content: [{ type: "text", text: error.message }],
            isError: true,
          };
        }
      },
    );
  }
  await server.connect(new StdioServerTransport());
}

module.exports = { createHandlers, runMcp };
