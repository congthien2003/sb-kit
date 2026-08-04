---
name: herdr-orchestra
description: Multi-agent orchestration based on herdr. Claude Code acts as the conductor, launching multiple CLI agents (codex / grok / gemini / claude(glm) etc.) in herdr panes, exchanging messages via `pane run` / `pane read` to collaborate, debate, and distribute work. Use in HERDR_ENV=1 environments when requests involve "agent orchestration", "multi-agent", "have them debate", "multiple agents", "collaborate via herdr". If in a psmux environment, refer to the agent-orchestra skill instead.
---

# herdr Orchestra — Multi-Agent Orchestration with herdr

Codex (the conductor) launches multiple AI CLI agents simultaneously using the herdr terminal multiplexer,
relaying messages between them to collaborate, debate, and distribute work.

> **Sister skill for psmux:** If you're in a psmux (Windows tmux alternative) environment, use `agent-orchestra` instead.
> This skill is **herdr-native**, and eliminates psmux's broadcast bugs, sleep-polling, and manual registry entirely.

## Architecture

```
         ┌─────────────┐
         │    Codex     │  ← Conductor (this session, focused pane)
         │  (Conductor) │
         └──────┬───────┘
                │ herdr pane run / pane read / pane get
       ┌────────┼────────┬────────┬────────┐
       │        │        │        │        │
      🤖       🤖       🤖       🤖       🤖
    grok     claude   codewhale  other    ...
   (w8:p1)  (w6:p1)   (w9:p1)   (wN:pM)
```

**Principle**: Only the conductor controls herdr. Worker agents require no configuration changes — they just run.
herdr routes to actual pane IDs individually, so there's no broadcast problem like psmux has.

---

## 0. Prerequisites (must check first)

```bash
echo "$HERDR_ENV"   # → should be 1
```

If `HERDR_ENV` is not `1`, you're not running inside herdr. Don't use this skill — inform the user you're outside herdr and stop.

- **herdr binary**: Must be on PATH (`command -v herdr`). Communicates with a running herdr instance via a unix socket.
- **Worker agents** (use whichever you need): `codex`, `grok`, `gemini`, `claude`, `aider`, `goose`, etc. Any agent with text input/output is compatible.

---

## ⚠️ Important: Verified Behavior of This Windows herdr Build (verified 2026-07-03)

There are parts that **differ** from herdr's official documentation. The following facts have been confirmed through actual testing. Follow these strictly.

| Item                                     | Verified Result                                                                                                                                        | Workaround                                                                                                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pane ID format**                       | `w9:p1` (not the doc's `1-1`). tab=`w9:t1`, workspace=`w9`                                                                                             | Always parse the actual ID from `list`/`create`/`split` responses                                                                                                          |
| **Default pane shell**                   | **PowerShell 5.1**                                                                                                                                     | Shell commands must use PowerShell syntax                                                                                                                                  |
| **`pane read` source**                   | `--source visible` ✅ / `recent`·`recent-unwrapped` ⚠️ unstable (empty or partial)                                                                     | **Always read with `--source visible`**                                                                                                                                    |
| **`herdr wait output`**                  | ❌ fails with `EmptyResponse`                                                                                                                          | Don't use it. Use polling instead (below)                                                                                                                                  |
| **`herdr wait agent-status`**            | ❌ fails with `subscription closed`                                                                                                                    | Don't use it. Use `pane get` polling instead (below)                                                                                                                       |
| **Sending long messages**                | `pane run` transmits ~250 chars of mixed Korean/English/symbols with **zero loss**                                                                     | No need for `-l` flag or buffer-paste                                                                                                                                      |
| **Long responses scrolling out of view** | For a 40-line grok response, the top 8 lines get pushed out of the viewport. **Neither `recent` nor `recent-unwrapped` can recover it (empty result)** | Content beyond the viewport **cannot be recovered by any source**. Keep responses within the viewport (**~30 lines** for a fullscreen workspace) or use headless `-p` mode |

> **Key point**: The `herdr wait ...` family is unstable in this build. Detect completion via **polling `agent_status` from `pane get`** + **`pane read --source visible`**. (If `wait` works in other herdr builds, it can be used alongside, but in this environment polling is the trusted method.)
>
> **Reported upstream (2026-07-03)**: `wait` failure → [ogulcancelik/herdr#963](https://github.com/ogulcancelik/herdr/issues/963), `recent` source empty result → [ogulcancelik/herdr#962](https://github.com/ogulcancelik/herdr/issues/962). Once these issues are closed, these workarounds can be re-verified and removed.

---

## 1. Understanding the Session — Live Registry

Unlike psmux, herdr **automatically detects** running agents. No need to manually memorize mappings.

```bash
herdr pane list
```

For each pane it provides as JSON: `pane_id`, `agent` (codex/claude/grok/…), `agent_status` (idle/working/blocked/done/unknown), `label`, `cwd`, `focused`, `workspace_id`, `tab_id`.

**The pane with `focused: true` is the conductor (you).** The rest are worker candidates.

Extracting a clean registry:

```bash
herdr pane list | python -c "import sys,json
for p in json.load(sys.stdin)['result']['panes']:
    me=' (ME)' if p.get('focused') else ''
    print(f\"{p['pane_id']:8} {p.get('agent','shell'):8} {p.get('agent_status','-'):8} {p.get('label','')}{me}\")"
```

Example output:

```
w2:p1    claude   working  claude(moderator) (ME)
w6:p1    claude   idle     glm
w7:p1    codex    idle     codex
w8:p1    grok     idle     grok
```

> Agents auto-detected by herdr: pi, claude, codex, copilot, devin, droid, kimi, opencode, kilo, hermes, qodercli, cursor, grok, etc. `glm` (a Claude Code wrapper backed by Z.AI) is detected as `claude`.

---

## 2. Preparing Worker Panes

If worker agents are already running (visible in `pane list`), skip step 2. To launch new ones:

### A. Split within the same tab (side by side)

```bash
# Split to the right, keeping focus on my pane
NEW=$(herdr pane split w2:p1 --direction right --no-focus \
  | python -c "import sys,json; print(json.load(sys.stdin)['result']['pane']['pane_id'])")
echo "new pane: $NEW"
# --direction down also works to split downward
```

### B. Separate tab (isolate sub-context)

```bash
herdr tab create --workspace w2 --label workers
# Parse result.tab.tab_id, result.root_pane.pane_id from the response
```

### C. Separate workspace (isolate noisy/fullscreen agents) — recommended for grok

Agents like grok that repaint the entire screen with a TUI will have their output scroll off-screen in a narrow split pane. **Giving it its own workspace** lets the TUI render properly and be fully captured with `pane read --source visible`.

```bash
herdr workspace create --no-focus --label grok \
  | python -c "import sys,json; r=json.load(sys.stdin)['result']; print(r['workspace']['workspace_id'], r['root_pane']['pane_id'])"
# Or move an existing pane: herdr pane move <pane> --new-workspace --label grok
```

**Response structure (verified):**

- `workspace create` → `result.workspace.workspace_id`, `result.tab.tab_id`, `result.root_pane.pane_id`
- `tab create` → `result.tab.tab_id`, `result.root_pane.pane_id`
- `pane split` → `result.pane.pane_id`

---

## 3. Running Agents

New panes start with a PowerShell shell. Run agent commands here.

```bash
# Codex
herdr pane run w7:p1 "codex"

# grok — headless -p is recommended for orchestration (see section 8)
herdr pane run w8:p1 "grok --no-alt-screen"

# Claude Code (separate instance)
herdr pane run w6:p1 "claude"

# Gemini (flash model recommended)
herdr pane run w9:p1 "gemini --model gemini-2.5-flash"
```

### Confirming Launch/Readiness — Polling

Since `wait output` doesn't work in this build, poll for `agent_status` transitioning from `unknown` (plain shell) → `idle` (agent ready), or read the screen directly.

```bash
# Once agent_status shows idle/working, the agent process has been detected
herdr pane get w7:p1 | python -c "import sys,json; print(json.load(sys.stdin)['result']['pane'].get('agent_status'))"

# Or check the prompt on screen
herdr pane read w7:p1 --source visible --lines 15
```

Readiness is confirmed when a prompt (`›`, `>`, `❯`, etc.) is visible.

---

## 4. Communication Protocol

### Sending Messages — `pane run` (text + Enter in one shot)

```bash
herdr pane run w7:p1 "Find the bug in this code. File: src/api/auth.ts"
```

- **Long messages work fine as-is.** Verified: ~250 characters of mixed Korean, English, symbols, slashes, and quotes are transmitted with no loss. psmux's `-l` flag, `C-m`, and buffer-paste are **completely unnecessary**.
- No issue with `/` being converted into a path (herdr sends it literally).

### Sending in Parts — send-text + send-keys

If a TUI treats Enter as premature submission, enter the body first, then submit separately:

```bash
herdr pane send-text w7:p1 "Body of a multi-line prompt ..."
herdr pane send-keys w7:p1 Enter
```

- `pane send-text` = text only, no Enter
- `pane send-keys <pane> Enter|Escape|Down|C-m ...` = key input
- **Caution with multi-line prompts**: each agent TUI treats newlines differently — as soft line breaks or as submission. To be safe: combine the prompt into a **single line** with `pane run`, or use headless `-p` for grok (section 8).

### Reading Responses (Worker → Conductor)

```bash
# The only reliable source in this build: visible
herdr pane read w7:p1 --source visible --lines 40

# ANSI snapshot for TUI feedback loops
herdr pane read w7:p1 --ansi --lines 40
```

> `--source recent` / `recent-unwrapped` are unstable in this build (empty or partial). **Don't trust them; use `--source visible`.** Note that visible, by definition, only gives you the **viewport (tail)** — long output that scrolls upward may be missed, so for verbose agents receive output headlessly (e.g. `grok -p`) or enlarge the pane.

### Detecting Completion (polling instead of infinite sleep)

Since the `wait` family is unstable, poll `agent_status`. Agents transition to `working` during a task and to `idle`/`done` when finished.

```bash
# Wait for completion: poll until agent_status leaves working and becomes idle/done
agent_wait() {
  local pane="$1" timeout="${2:-120}" elapsed=0
  while [ "$elapsed" -lt "$timeout" ]; do
    local st=$(herdr pane get "$pane" \
      | python -c "import sys,json; print(json.load(sys.stdin)['result']['pane'].get('agent_status',''))")
    case "$st" in
      idle|done) echo "READY ($st)"; return 0 ;;
    esac
    sleep 3; elapsed=$((elapsed+3))
  done
  echo "TIMEOUT after ${timeout}s (last=$st)"; return 1
}
# Usage: after sending a task
agent_wait w7:p1 120
herdr pane read w7:p1 --source visible --lines 60
```

> Tip: right after sending a task, the status may still briefly show `idle` (detection lag). To be sure, wait a moment (2–3 seconds) before running `agent_wait`, or cross-check with `pane read` to see if the "working/thinking" spinner has disappeared.

---

## 5. Orchestration Patterns

The patterns themselves are tool-agnostic. In herdr, routing is isolated per pane ID, so you can safely send in parallel.

### Pattern A: Parallel Query (same question, different agents)

```
1. Send the same question to all workers via pane run
2. agent_wait on each worker, then pane read to collect
3. Conductor synthesizes/compares
```

Use case: code review, architecture opinions, brainstorming

### Pattern B: Debate (cross-relay)

```
1. Send the topic to all workers → collect each position
2. Relay opposing positions and request rebuttals (repeat rounds)
3. Conductor produces final synthesis
```

Use case: design decisions, trade-off analysis, technology choices

### Pattern C: Pipeline (sequential processing)

```
Agent A (task 1) → result → Agent B (task 2) → result → Agent C (task 3)
```

Use case: analyze→implement→review, draft→edit→proofread

### Pattern D: Task Distribution (divide and conquer)

```
Split a large task into N parts → assign each subtask to a different worker → collect all → conductor integrates
```

Use case: large-scale file analysis, multi-repo investigation, batch jobs

### Pattern E: Cross-Verification

Different models have different biases. Critical decisions should be verified by N-way consensus.

```
1. Send the same verification prompt to all workers: "Any security vulnerabilities in this code? PASS/FAIL + reason"
2. All must PASS to proceed. Any FAIL triggers re-review
3. On disagreement, relay the FAIL reasoning to the other workers for re-evaluation
```

**Key principle**: Don't trust a single model's "LGTM". 3 models must independently agree.

### Pattern F: State Machine (enforcing workflow)

```
IDLE → DISPATCHED → COLLECTING → VERIFIED → COMMITTED
```

Transition only to the next state at each step; skipping is not allowed. herdr's `agent_status` serves as the signal for the DISPATCHED→COLLECTING transition.

---

## 6. Helper Functions (optional)

```bash
# Send a message
agent_send() { herdr pane run "$1" "${*:2}"; }

# Read a response (fixed to visible)
agent_read() { herdr pane read "$1" --source visible --lines "${2:-40}"; }

# Query status
agent_status() {
  herdr pane get "$1" | python -c "import sys,json; print(json.load(sys.stdin)['result']['pane'].get('agent_status'))"
}

# Send → wait for completion → read (agent_wait defined in section 4)
agent_ask() {
  local pane="$1" to="${2:-120}"; agent_send "$pane" "${*:3}"
  sleep 2; agent_wait "$pane" "$to"; agent_read "$pane" 60
}

# Usage example
agent_ask w7:p1 120 "Analyze the time complexity of this function"
```

---

## 7. Agent-Specific Notes

### Codex CLI (`codex`)

- Pane shell is PowerShell → no `/` path issues
- Auto-detected by herdr (`agent:"codex"`) → completion can be judged via `agent_status`
- If a trust/approval dialog appears on first launch, pass it through with `pane send-keys <pane> Enter`

### grok (Grok Build TUI) — **headless `-p` strongly recommended**

- **Don't scrape long output (code blocks) from the live TUI.** grok repaints the screen via cursor movement when sending, causing the top of long blocks to scroll out of the read buffer (verified — not fixed by `--no-alt-screen`).
- **Use headless for orchestration/response retrieval:** running directly via the Bash tool is cleanest.
  ```bash
  grok -p "<prompt>" [--output-format plain|json] [--json-schema '{...}'] \
       [-m MODEL] [--effort low|medium|high|xhigh|max] [--cwd DIR]
  ```
  Outputs the full response to stdout and exits (exit 0). Use `--json-schema` to force parseable JSON.
- **Headless is also stateful**: after `grok -p "..."`, continue the same conversation with `grok -c -p "..."` (or `--resume <id>`). Headless mode only loses live streaming, not memory.
- If you want to view grok live via TUI, you must isolate it in **its own workspace (fullscreen)** (`herdr workspace create --label grok`) for responses to be readable. If it looks "stuck" in a narrow split, it's not actually stuck — the answer scrolled out of view. Move it to fullscreen. Completion marker: `Turn completed in Ns`.
- **Even in a fullscreen workspace, content beyond the viewport cannot be read (verified 2026-07-03):** short/medium responses (**~30 lines or less** for a fullscreen workspace) are recovered with zero loss via live TUI + `pane read --source visible` — equivalent to headless (including sending the prompt and detecting completion via `Turn completed`). But in a 40-line response test, the top 8 lines scrolled out and were unrecoverable via either `--source recent`/`recent-unwrapped` (both returned empty) → **content beyond the limit cannot be recovered by any source.** Conclusion: short replies like debate statements/verdicts/votes don't need headless mode; **only long code blocks/reports** need headless `-p` (or constrain the prompt to "within N lines/sentences").
- On TUI launch, the "Run Grok Build in which directory?" dialog swallows the first prompt → answer with `pane send-keys <pane> 1` then `Enter` before sending the task. (Headless `-p` doesn't have this dialog.)
- Note: grok is auto-detected by herdr but isn't in the `herdr integration install` list → only process-detection status is provided (still sufficient for multiplexing).

### Gemini CLI (`gemini`)

- Free-tier high-demand errors are frequent → `gemini --model gemini-2.5-flash` recommended
- May need automatic handling of the Trust dialog (`pane send-keys <pane> Enter`)

### Claude Code / glm (`claude`)

- `glm` is a Claude Code wrapper backed by the Z.AI GLM backend → herdr detects it as `claude`
- Watch out for double token billing when running a separate instance (conductor + worker)
- Consider `--dangerously-skip-permissions` if unattended execution is needed

### General (when adding a new agent)

1. Prepare pane: `herdr pane split <my-pane> --direction right --no-focus`
2. Run: `herdr pane run <new-pane> "agent-name"`
3. Confirm detection: `herdr pane get <new-pane>` → check that `agent_status` is populated
4. Confirm reading: `herdr pane read <new-pane> --source visible`

---

## 8. Troubleshooting

| Symptom                                           | Cause                                                                                                                                                                | Solution                                                                                                                             |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `pane read` is empty/partial                      | `--source recent`/`recent-unwrapped` unstable                                                                                                                        | Use `--source visible`                                                                                                               |
| Long output not fully readable                    | visible only shows the viewport, top scrolls out (verified: top 8 of 40 lines lost for grok). **`recent`/`recent-unwrapped` also fail to recover it (empty result)** | Constrain response to within the viewport (**~30 lines** for fullscreen, via prompt instruction) or receive via headless (`grok -p`) |
| `wait output` returns `EmptyResponse`             | wait subsystem unstable in this build                                                                                                                                | Poll with `pane get` + `pane read --source visible`                                                                                  |
| `wait agent-status` returns `subscription closed` | same                                                                                                                                                                 | Poll with `agent_wait()` (section 4)                                                                                                 |
| Old pane ID doesn't match                         | IDs get compacted when tabs/panes close                                                                                                                              | Always re-parse the current ID from `pane list`/`split` responses                                                                    |
| grok response not readable                        | TUI repaint scrolled it out in a narrow pane                                                                                                                         | Move grok to its own workspace or use headless `-p`                                                                                  |
| grok's first prompt gets ignored                  | "which directory?" dialog                                                                                                                                            | Answer with `send-keys 1` + `Enter` first                                                                                            |
| Long prompt gets submitted prematurely            | Agent TUI treats newline as Enter                                                                                                                                    | Combine into a single line for `pane run`, or use send-text followed by send-keys Enter                                              |
| agent_status stays unknown                        | plain shell or undetected agent                                                                                                                                      | Normal. Judge readiness directly from the screen prompt via `pane read`                                                              |
| High-demand errors (gemini)                       | API traffic exceeded                                                                                                                                                 | Switch model (flash) or retry                                                                                                        |

---

## 9. Session Cleanup

```bash
# Close a specific worker pane
herdr pane close w9:p2

# Close an entire tab/workspace
herdr tab close w9:t1
herdr workspace close w9
```

Do not close the conductor (focused pane).

---

## Execution Checklist

When the conductor (Claude Code) starts orchestration:

1. [ ] `echo $HERDR_ENV` → confirm `1` (stop if not)
2. [ ] `herdr pane list` → check the live registry, identify my pane (focused)
3. [ ] If needed workers aren't present, prepare them with `pane split` / `tab create` / `workspace create` (parse IDs from responses)
4. [ ] Run agents in each pane with `pane run`, confirm detection with `pane get`
5. [ ] Select an orchestration pattern (A–F)
6. [ ] Send tasks (`pane run`) → poll with `agent_wait` → collect with `pane read --source visible`
7. [ ] Conductor synthesizes/verifies/applies results
8. [ ] Clean up with `pane close` / `workspace close`

## Agent Registry

Unlike psmux, **no manual management needed** — `herdr pane list` provides it live. Snapshot only if needed:

```
AGENTS (per herdr pane list):
  codex   → w7:p1   (GPT-5.x, coding-focused)
  grok    → w8:p1   (headless -p recommended)
  glm     → w6:p1   (detected as claude, GLM backend)
  claude2 → wN:pM   (general-purpose)
```

The conductor assigns tasks to the appropriate agent based on `agent_status` and label.
