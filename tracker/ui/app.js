const state = {
  date: dateKey(new Date()),
  summary: null,
  selectedSessionId: null,
  signature: "",
};
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value = "") =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function statusLabel(status) {
  return status.replace("_", " ");
}

function selectedSession() {
  const sessions = state.summary?.sessions || [];
  return (
    sessions.find((session) => session.id === state.selectedSessionId) ||
    sessions[0] ||
    null
  );
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...options.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || "Request failed.");
  return body;
}

function notify(message, error = false) {
  const node = $("#status");
  node.textContent = message;
  node.style.background = error ? "var(--error)" : "var(--ink)";
  node.classList.add("visible");
  setTimeout(() => node.classList.remove("visible"), 2200);
}

async function loadBoard() {
  try {
    const summary = await api(`/api/summary?date=${state.date}`);
    const signature = JSON.stringify(summary);
    if (signature !== state.signature) {
      const sessions = summary.sessions || [];
      if (!sessions.some((session) => session.id === state.selectedSessionId)) {
        state.selectedSessionId = sessions[0]?.id ?? null;
      }
      state.summary = summary;
      state.signature = signature;
      render();
    }
  } catch (error) {
    notify(error.message, true);
  }
}

function render() {
  renderDate();
  renderSessionList();
  renderSessionDetail();
  renderArtifacts();
}

function renderDate() {
  const sessions = state.summary?.sessions || [];
  const totals = sessions.reduce(
    (counts, session) => {
      counts.total += session.counts.total;
      counts.done += session.counts.done;
      return counts;
    },
    { total: 0, done: 0 },
  );
  $("#board-date").textContent = new Date(
    `${state.date}T12:00:00`,
  ).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  $("#board-counts").textContent =
    `${sessions.length} sessions · ${totals.done}/${totals.total} tasks done`;
}

function renderSessionList() {
  const sessions = state.summary?.sessions || [];
  $("#session-list").innerHTML = sessions.length
    ? `<div class="session-nav-list">${sessions
        .map(
          (session) =>
            `<button class="session-nav-item${session.id === state.selectedSessionId ? " selected" : ""}" data-select-session="${session.id}" ${session.id === state.selectedSessionId ? 'aria-current="true"' : ""}>
              <span class="session-nav-title">${escapeHtml(session.title)}</span>
              <span class="session-nav-meta">${session.counts.done}/${session.counts.total} tasks</span>
            </button>`,
        )
        .join("")}</div>`
    : `<div class="empty compact"><p>No sessions for this day.</p><button class="button-primary" data-new-session>Create session</button></div>`;
}

function renderSessionDetail() {
  const session = selectedSession();
  if (!session) {
    $("#session-detail").innerHTML =
      `<div class="empty detail-empty"><span class="empty-mark">○</span><h1>No session selected</h1><p>Create a session to start tracking work.</p><button class="button-primary" data-new-session>New session</button></div>`;
    return;
  }
  $("#session-detail").innerHTML = `
    <header class="detail-header">
      <div>
        <span class="kicker">Session ${String(session.id).padStart(2, "0")}</span>
        <h1>${escapeHtml(session.title)}</h1>
        <p>${escapeHtml(session.summary || "No summary added yet.")}</p>
      </div>
      <div class="detail-actions">
        <button class="button-primary" data-task="${session.id}">Add task</button>
        <details class="action-menu">
          <summary aria-label="Session actions">•••</summary>
          <div class="action-popover">
            <button data-edit-session="${session.id}">Edit session</button>
            <button class="danger-action" data-archive-session="${session.id}">Archive</button>
          </div>
        </details>
      </div>
    </header>
    <div class="section-heading">
      <h2>Tasks</h2>
      <span>${session.counts.done} of ${session.counts.total} done</span>
    </div>
    <div class="task-list">
      ${
        session.tasks.length
          ? session.tasks.map((task) => renderTask(task, session.id)).join("")
          : `<div class="empty compact"><p>No tasks in this session.</p><button data-task="${session.id}">Add the first task</button></div>`
      }
    </div>`;
}

function renderTask(task, sessionId) {
  return `<article class="task">
    <div class="task-copy">
      ${renderStatusControl(task)}
      <div>
        <h3>${escapeHtml(task.title)}</h3>
        ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ""}
      </div>
    </div>
    <div class="task-actions">
      <button class="text-button" data-copy="${task.id}">Copy prompt</button>
      <button class="icon-button" data-edit-task="${task.id}" data-session="${sessionId}" aria-label="Edit ${escapeHtml(task.title)}">✎</button>
    </div>
  </article>`;
}

function renderStatusControl(task) {
  const transitions = {
    todo: ["in_progress"],
    in_progress: ["blocked", "done"],
    blocked: ["in_progress"],
    done: ["in_progress"],
  };
  return `<select class="status status-${task.status}" data-task-status="${task.id}" data-current="${task.status}" aria-label="Status for ${escapeHtml(task.title)}">
    <option selected value="${task.status}">${statusLabel(task.status)}</option>
    ${transitions[task.status]
      .map((status) => `<option value="${status}">${statusLabel(status)}</option>`)
      .join("")}
  </select>`;
}

function renderArtifacts() {
  const session = selectedSession();
  if (!session) {
    $("#artifact-panel").innerHTML =
      `<div class="panel-heading"><span class="kicker">References</span><h2>Artifacts</h2></div><p class="muted">Select a session to view its files.</p>`;
    return;
  }
  const artifacts = session.artifacts || [];
  $("#artifact-panel").innerHTML = `
    <div class="panel-heading">
      <div><span class="kicker">References</span><h2>Artifacts</h2></div>
      <button class="icon-button" data-artifact="${session.id}" aria-label="Add artifact">+</button>
    </div>
    ${
      artifacts.length
        ? ["spec", "implementation_plan", "doc"]
            .map((type) => renderArtifactType(type, artifacts))
            .join("")
        : `<div class="empty compact"><p>No artifacts yet.</p><button data-artifact="${session.id}">Add artifact</button></div>`
    }`;
}

function renderArtifactType(type, artifacts) {
  const typeArtifacts = artifacts.filter((artifact) => artifact.type === type);
  if (!typeArtifacts.length) return "";
  const groups = new Map();
  for (const artifact of typeArtifacts) {
    if (!groups.has(artifact.key)) groups.set(artifact.key, []);
    groups.get(artifact.key).push(artifact);
  }
  const label = {
    spec: "Specs",
    implementation_plan: "Implementation plans",
    doc: "Docs",
  }[type];
  return `<section class="artifact-section">
    <h3>${label}</h3>
    ${[...groups.entries()]
      .map(([key, versions]) => {
        const ordered = [...versions].sort((a, b) => b.version - a.version);
        const latest = ordered.find((artifact) => artifact.latest) || ordered[0];
        return `<article class="artifact-group">
          <div class="artifact-title"><strong>${escapeHtml(latest.title)}</strong><span class="version">v${latest.version}</span></div>
          <code>${escapeHtml(latest.path)}</code>
          ${
            ordered.length > 1
              ? `<details><summary>${ordered.length - 1} older version${ordered.length === 2 ? "" : "s"}</summary><ul>${ordered
                  .slice(1)
                  .map(
                    (artifact) =>
                      `<li><span>v${artifact.version}</span><code>${escapeHtml(artifact.path)}</code></li>`,
                  )
                  .join("")}</ul></details>`
              : ""
          }
          <span class="artifact-key">${escapeHtml(key)}</span>
        </article>`;
      })
      .join("")}
  </section>`;
}

function openForm(id, values = {}) {
  const dialog = $(id);
  const form = dialog.querySelector("form");
  form.reset();
  for (const [key, value] of Object.entries(values)) {
    if (form.elements[key]) form.elements[key].value = value ?? "";
  }
  dialog.showModal();
}

async function updateTaskStatus(id, status, blockedReason) {
  await api(`/api/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, blockedReason, actor: "human" }),
  });
  await loadBoard();
}

document.addEventListener("change", async (event) => {
  const select = event.target.closest("[data-task-status]");
  if (!select) return;
  const status = select.value;
  select.value = select.dataset.current;
  if (status === "blocked") {
    openForm("#blocked-dialog", { taskId: select.dataset.taskStatus });
    return;
  }
  try {
    await updateTaskStatus(select.dataset.taskStatus, status);
  } catch (error) {
    notify(error.message, true);
  }
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  try {
    if (button.id === "new-session" || button.dataset.newSession !== undefined) {
      openForm("#session-dialog");
    } else if (button.dataset.selectSession) {
      state.selectedSessionId = Number(button.dataset.selectSession);
      render();
    } else if (button.dataset.task) {
      openForm("#task-dialog", { sessionId: button.dataset.task });
    } else if (button.dataset.artifact) {
      openForm("#artifact-dialog", { sessionId: button.dataset.artifact });
    } else if (button.dataset.editSession) {
      openForm(
        "#session-dialog",
        state.summary.sessions.find(
          (session) => session.id == button.dataset.editSession,
        ),
      );
    } else if (button.dataset.archiveSession) {
      if (!confirm("Archive this session?")) return;
      await api(`/api/sessions/${button.dataset.archiveSession}/archive`, {
        method: "POST",
        body: JSON.stringify({ actor: "human" }),
      });
      await loadBoard();
    } else if (button.dataset.editTask) {
      openForm("#task-dialog", {
        ...state.summary.sessions
          .flatMap((session) => session.tasks)
          .find((task) => task.id == button.dataset.editTask),
        sessionId: button.dataset.session,
      });
    } else if (button.dataset.copy) {
      const { prompt } = await api(`/api/handoff/${button.dataset.copy}`);
      await navigator.clipboard.writeText(prompt);
      notify("Handoff prompt copied.");
    } else if (button.id === "previous-date" || button.id === "next-date") {
      const date = new Date(`${state.date}T12:00:00`);
      date.setDate(date.getDate() + (button.id === "next-date" ? 1 : -1));
      state.date = dateKey(date);
      state.selectedSessionId = null;
      state.signature = "";
      await loadBoard();
    } else if (button.id === "today") {
      state.date = dateKey(new Date());
      state.selectedSessionId = null;
      state.signature = "";
      await loadBoard();
    } else if (button.dataset.close !== undefined) {
      button.closest("dialog").close();
    }
  } catch (error) {
    notify(error.message, true);
  }
});

for (const [id, path, method] of [
  ["#session-form", "/api/sessions", "POST"],
  ["#task-form", "/api/tasks", "POST"],
  ["#artifact-form", "/api/artifacts", "POST"],
]) {
  $(id).addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    data.actor = "human";
    const target = data.id ? `${path}/${data.id}` : path;
    if (data.sessionId) data.sessionId = Number(data.sessionId);
    delete data.id;
    try {
      const saved = await api(target, {
        method: target === path ? method : "PATCH",
        body: JSON.stringify(data),
      });
      if (id === "#session-form" && target === path) {
        state.date = dateKey(new Date());
        state.selectedSessionId = saved.id;
        state.signature = "";
      }
      form.closest("dialog").close();
      await loadBoard();
    } catch (error) {
      notify(error.message, true);
    }
  });
}

$("#blocked-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  try {
    await updateTaskStatus(data.taskId, "blocked", data.blockedReason);
    form.closest("dialog").close();
  } catch (error) {
    notify(error.message, true);
  }
});

loadBoard();
setInterval(() => {
  if (document.visibilityState === "visible" && !$("dialog[open]")) loadBoard();
}, 2000);
