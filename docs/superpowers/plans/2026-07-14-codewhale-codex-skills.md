# CodeWhale Codex Skills Implementation Plan

> **For agentic workers:** Implement inline after this plan is approved. Do not dispatch subagents, commit, or run build, test, lint, or verification commands.

**Goal:** Package two Codex skills that delegate bounded investigation and approved implementation work to a locally installed CodeWhale CLI.

**Architecture:** Add two self-contained skill folders under `.agents/skills`, each containing only `SKILL.md` and UI metadata. Both use CodeWhale one-shot headless execution in Codex's current folder; the investigate skill prohibits edits, while the implement skill requires prior user authorization and a bounded request.

**Tech Stack:** Markdown Codex skills, YAML skill metadata, CodeWhale CLI (`codewhale exec --auto --output-format stream-json`).

---

## File structure

- Create: `.agents/skills/sk-codewhale-investigate/SKILL.md` — read-only delegation workflow and strict output contract.
- Create: `.agents/skills/sk-codewhale-investigate/agents/openai.yaml` — skill-list metadata.
- Create: `.agents/skills/sk-codewhale-implement/SKILL.md` — approval-gated implementation delegation workflow.
- Create: `.agents/skills/sk-codewhale-implement/agents/openai.yaml` — skill-list metadata.
- Modify: `README.md` — list both newly packaged skills.

### Task 1: Add `/sk-codewhale-investigate`

**Files:**

- Create: `.agents/skills/sk-codewhale-investigate/SKILL.md`
- Create: `.agents/skills/sk-codewhale-investigate/agents/openai.yaml`

- [ ] **Step 1: Write the investigate skill metadata and workflow**

Create `SKILL.md` with exact frontmatter:

```yaml
---
name: sk-codewhale-investigate
description: Delegate a read-only repository investigation to the locally installed CodeWhale CLI in headless mode. Use when the user asks to map code, diagnose a problem, collect evidence, or propose the smallest safe next step without editing files.
---
```

Require this workflow: read local `AGENTS.md` when present; confirm `codewhale` is available; use the current folder as the `--workspace` value; compose a prompt that forbids writes, tests, installs, commits, and work outside that folder; invoke `codewhale exec --auto --output-format stream-json`; summarize only evidence, risks, and a smallest next step. Stop on a CLI error without retrying with broader permissions.

- [ ] **Step 2: Add UI metadata**

Create `agents/openai.yaml`:

```yaml
interface:
  display_name: "SK CodeWhale Investigate"
  short_description: "Run bounded CodeWhale investigations"
  default_prompt: "Use $sk-codewhale-investigate to inspect this repository and return evidence with the smallest safe next step."
```

### Task 2: Add `/sk-codewhale-implement`

**Files:**

- Create: `.agents/skills/sk-codewhale-implement/SKILL.md`
- Create: `.agents/skills/sk-codewhale-implement/agents/openai.yaml`

- [ ] **Step 1: Write the implementation skill metadata and workflow**

Create `SKILL.md` with exact frontmatter:

```yaml
---
name: sk-codewhale-implement
description: Delegate an already approved, bounded code change to the locally installed CodeWhale CLI in headless mode. Use only after the user approves an implementation plan or explicitly authorizes a scoped change with acceptance criteria.
---
```

Require the skill to stop and request a plan/authorization when it is absent. Otherwise require the delegation prompt to include outcome, in-scope files or behavior, exclusions, acceptance criteria, and user-requested verification. Use the current folder as `--workspace`, invoke `codewhale exec --auto --output-format stream-json`, prohibit commits and scope expansion, and report changed files plus evidence. Stop on a CLI error; never enable YOLO, change CodeWhale configuration, or retry with broader permissions.

- [ ] **Step 2: Add UI metadata**

Create `agents/openai.yaml`:

```yaml
interface:
  display_name: "SK CodeWhale Implement"
  short_description: "Delegate approved scoped CodeWhale changes"
  default_prompt: "Use $sk-codewhale-implement to make this approved scoped change with the stated acceptance criteria."
```

### Task 3: Document the packaged skills

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Extend the `## Skills` list**

Append two concise entries after the existing skills:

```markdown
### `sk-codewhale-investigate`

Delegates a read-only repository investigation to CodeWhale headless mode and returns evidence plus the smallest next step.

### `sk-codewhale-implement`

Delegates an approved, bounded implementation task to CodeWhale headless mode without commits or scope expansion.
```

### Task 4: Hand off manual validation

**Files:**

- No file changes.

- [ ] **Step 1: Do not run verification commands**

Per repository instructions, do not run validation. Provide these optional user-run commands after implementation:

```powershell
python C:\Users\pc\.codex\skills\.system\skill-creator\scripts\quick_validate.py .agents\skills\sk-codewhale-investigate
python C:\Users\pc\.codex\skills\.system\skill-creator\scripts\quick_validate.py .agents\skills\sk-codewhale-implement
codewhale --help
```

Explain that the first two only validate skill folder/frontmatter structure; the final command only confirms that the local CodeWhale executable is available. Do not run a live CodeWhale delegation unless the user explicitly asks.

## Self-review

- Spec coverage: Tasks 1 and 2 implement the two required workflows, current-folder workspace boundary, direct headless invocation, no credentials, error stop behavior, and approval gating. Task 3 makes them discoverable in the kit; Task 4 preserves the repository's no-auto-verification rule.
- No placeholders: all created paths, metadata, workflow constraints, and optional user-run commands are explicit.
- Consistency: both skill folders follow the existing `SKILL.md` plus `agents/openai.yaml` pattern; neither requires scripts, references, assets, dependencies, commits, or configuration changes.
