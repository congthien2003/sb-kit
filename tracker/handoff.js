function buildHandoff({ root, session, task, artifacts }) {
  const artifactLines = artifacts
    .map(
      (artifact) =>
        `- [${artifact.type}] ${artifact.title} (${artifact.path}, v${artifact.version}${artifact.latest ? ", latest" : ""})`,
    )
    .join("\n");

  return `Repository: ${root}
Session #${session.id}: ${session.title}
Session summary: ${session.summary || "(none)"}

Task #${task.id}: ${task.title}
Description: ${task.description || "(none)"}
Acceptance criteria:
${task.acceptanceCriteria || "(none)"}

Available session artifacts:
${artifactLines || "(none)"}

Before implementation:
1. Read AGENTS.md and follow repository instructions.
2. Run \`sb-kit track artifact list --session ${session.id}\` or call \`artifact_list\`.
3. Select and read the specs, implementation plans, and docs relevant to this task.
4. Mark task ${task.id} in_progress with your agent name when work starts.
5. Mark it done when complete, or blocked with a reason when work cannot continue.
6. Do not commit unless explicitly requested.
`;
}

module.exports = { buildHandoff };
