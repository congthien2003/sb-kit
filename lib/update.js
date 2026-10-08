const fs = require("fs");
const path = require("path");
const stateTools = require("./skill-state");
const PACKAGE_VERSION = require("../package.json").version;

function changedFiles(local, upstream) {
  const left = new Map(local.files.map((file) => [file.path, file]));
  const right = new Map(upstream.files.map((file) => [file.path, file]));
  const changes = [];
  for (const name of [...new Set([...left.keys(), ...right.keys()])].sort()) {
    if (left.get(name)?.sha256 !== right.get(name)?.sha256) {
      changes.push({ path: name, kind: !left.has(name) ? "added" : !right.has(name) ? "removed" : "changed", type: "file" });
    }
  }
  for (const name of [...new Set([...local.directories, ...upstream.directories])].sort()) {
    if (local.directories.includes(name) !== upstream.directories.includes(name)) {
      changes.push({ path: name, kind: upstream.directories.includes(name) ? "added" : "removed", type: "directory" });
    }
  }
  return changes;
}

function excerpt(target, change, io = fs) {
  if (change.type !== "file" || /(?:^|\/)(?:\.env|.*(?:secret|credential|token|password))/i.test(change.path) ||
      !/\.(?:md|txt|json|ya?ml|js|ts|html|css)$/i.test(change.path)) return [];
  function read(dir, entries) {
    const record = entries.find((file) => file.path === change.path);
    if (!record) return "";
    if (record.size > 16384) return null;
    const file = path.join(dir, ...change.path.split("/"));
    stateTools.statSafe(file, io);
    const bytes = io.readFileSync(file);
    if (bytes.includes(0)) return null;
    return bytes.toString("utf8");
  }
  const before = read(target.destination, target.local.files);
  const after = read(target.source, target.upstream.files);
  if (before === null || after === null) return [];
  const sensitive = /(?:secret|token|password|api[_-]?key|authorization|credential)\s*["']?\s*[:=]\s*["']?[^\s"']+|-----BEGIN .*PRIVATE KEY-----|eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/i;
  if (sensitive.test(before) || sensitive.test(after)) return [];
  const oldLines = before.split(/\r?\n/);
  const newLines = after.split(/\r?\n/);
  let start = 0;
  while (start < oldLines.length && start < newLines.length && oldLines[start] === newLines[start]) start++;
  let endOld = oldLines.length;
  let endNew = newLines.length;
  while (endOld > start && endNew > start && oldLines[endOld - 1] === newLines[endNew - 1]) { endOld--; endNew--; }
  const lines = [
    ...oldLines.slice(start, Math.min(endOld, start + 6)).map((line) => `- ${line}`),
    ...newLines.slice(start, Math.min(endNew, start + 6)).map((line) => `+ ${line}`),
  ];
  return lines.map((line) => line.replace(/[\x00-\x1f\x7f]/g, " ").slice(0, 240));
}

function planUpdate(projectDir, packageDir, selection, { io = fs, packageVersion = PACKAGE_VERSION } = {}) {
  const state = stateTools.readState(projectDir, io);
  stateTools.assertNoPendingOperation(projectDir, io);
  const targets = [];
  const skipped = [];
  const seen = new Set();
  for (const { root, skill } of selection) {
    const key = `${root}:${skill}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const source = stateTools.skillPath(packageDir, ".agents", skill);
    const destination = stateTools.skillPath(projectDir, root, skill);
    const local = stateTools.snapshot(destination, io);
    const upstream = stateTools.snapshot(source, io);
    if (!upstream.files.some((file) => file.path === "SKILL.md")) throw new Error("Packaged update source is incomplete.");
    const baseline = state.roots[root][skill] || null;
    if (local.treeHash === upstream.treeHash) {
      skipped.push({ root, skill, reason: "identical; receipt not reseeded" });
      continue;
    }
    const target = {
      root, skill, source, destination, local, upstream,
      status: stateTools.provenance(local, upstream, baseline),
      needsOverwriteConsent: !baseline || local.treeHash !== baseline.treeHash,
      changes: changedFiles(local, upstream),
    };
    let excerptCount = 0;
    for (const change of target.changes) {
      change.excerpt = excerptCount < 5 ? excerpt(target, change, io) : [];
      if (change.excerpt.length) excerptCount++;
    }
    if (stateTools.snapshot(source, io).treeHash !== upstream.treeHash ||
        stateTools.snapshot(destination, io).treeHash !== local.treeHash) {
      throw new Error("Skill changed while preparing the preview; start a new preview.");
    }
    targets.push(target);
  }
  return { projectDir: path.resolve(projectDir), packageDir: path.resolve(packageDir), packageVersion, stateBefore: JSON.stringify(state), targets, skipped };
}

function renderUpdate(plan) {
  const lines = ["Offline update preview — source is this installed sb-kit package, not the latest network release."];
  for (const target of plan.targets) {
    lines.push(`${target.root}/${target.skill}: ${target.status}${target.needsOverwriteConsent ? " (extra overwrite consent required)" : ""}`);
    lines.push(`  local ${target.local.treeHash} -> package ${target.upstream.treeHash}`);
    for (const change of target.changes) {
      lines.push(`  ${change.kind} ${change.type}: ${change.path}`);
      lines.push(...change.excerpt.map((line) => `    ${line}`));
    }
  }
  for (const target of plan.skipped) lines.push(`Skipped ${target.root}/${target.skill}: ${target.reason}`);
  lines.push("Excerpts are bounded and omit binary, large or sensitive-like contents; they are not a complete diff or a guarantee of secret detection.");
  return lines.join("\n");
}

function recoveryText(target, backupDir) {
  return `# Manual recovery\n\nTarget: ${target.destination}\n\nOriginal skill backup: ${path.join(backupDir, "original")}\nPrior receipt state: ${path.join(backupDir, "before-state.json")}\n\nStop active writers first. Inspect .sb-kit/operation.json and the target before choosing recovery.\nRestore the complete original skill directory (including local-only files), not a merge into the replacement.\nFor the last failed target, restore before-state.json to .sb-kit/state.json; this snapshot retains earlier successful targets.\nDo not restore an earlier successful target's whole state over later successful receipts.\nOnly after the selected skill and receipts are consistent, manually mark the operation rolled-back and remove .sb-kit/mutation.lock.\nNever delete a backup until recovery has been confirmed. No automatic recovery or backup pruning is performed.\n`;
}

function applyUpdate(plan, { approved = false, allowOverwrite = false, io = fs, log = console.log } = {}) {
  if (!approved) throw new Error("Update requires explicit final approval.");
  if (plan.targets.some((target) => target.needsOverwriteConsent) && !allowOverwrite) {
    throw new Error("Unknown or locally modified skills require explicit overwrite consent.");
  }
  for (const target of plan.targets) {
    if (target.destination !== stateTools.skillPath(plan.projectDir, target.root, target.skill) ||
        target.source !== stateTools.skillPath(plan.packageDir, ".agents", target.skill)) {
      throw new Error("Update plan paths do not match the managed skill roots.");
    }
  }
  const result = { completed: [], failed: null, skipped: plan.skipped, unattempted: [], backups: [], recoveryRequired: false };
  if (!plan.targets.length) return result;
  let mutation;
  let activeTarget;
  let attempted = 0;
  let recoveryRequired = false;
  try {
    if (JSON.stringify(stateTools.readState(plan.projectDir, io)) !== plan.stateBefore) {
      throw new Error("Install receipts changed since preview; start a new preview.");
    }
    // Fail before any writes when a selected filesystem cannot flush directories.
    stateTools.syncDirectory(path.resolve(plan.projectDir), io);
    for (const target of plan.targets) stateTools.syncAncestors(path.dirname(target.destination), plan.projectDir, io);
    mutation = stateTools.beginMutation(plan.projectDir, "update", io, { durable: true });
    let state = stateTools.readState(plan.projectDir, io);
    if (JSON.stringify(state) !== plan.stateBefore) throw new Error("Receipts changed since preview.");
    for (const target of plan.targets) {
      activeTarget = target;
      attempted++;
      const backupDir = stateTools.managedPath(plan.projectDir, ".sb-kit", "backups", mutation.operation.id, target.root, target.skill);
      const original = path.join(backupDir, "original");
      const incoming = path.join(backupDir, "incoming");
      const displaced = path.join(backupDir, "displaced");
      const before = JSON.stringify(state);
      let moved = false;
      let installed = false;
      let receiptChanged = false;
      mutation.operation.current = { root: target.root, skill: target.skill, backup: path.relative(plan.projectDir, backupDir), phase: "preparing" };
      mutation.record();
      try {
        if (stateTools.snapshot(target.source, io).treeHash !== target.upstream.treeHash ||
            stateTools.snapshot(target.destination, io).treeHash !== target.local.treeHash) {
          throw new Error("Source or destination changed since preview; refusing overwrite.");
        }
        stateTools.statSafe(backupDir, io);
        io.mkdirSync(backupDir, { recursive: true });
        stateTools.atomicJson(path.join(backupDir, "before-state.json"), state, io, { durable: true });
        io.cpSync(target.destination, original, { recursive: true });
        if (stateTools.snapshot(original, io).treeHash !== target.local.treeHash) throw new Error("Backup snapshot differs from preview.");
        io.writeFileSync(path.join(backupDir, "recovery.md"), recoveryText(target, backupDir), { flag: "wx" });
        stateTools.syncTree(original, io);
        stateTools.syncFile(path.join(backupDir, "recovery.md"), io);
        stateTools.syncAncestors(backupDir, plan.projectDir, io);
        result.backups.push({ root: target.root, skill: target.skill, path: original, state: path.join(backupDir, "before-state.json") });
        mutation.operation.current.phase = "backed-up";
        mutation.record();
        io.cpSync(target.source, incoming, { recursive: true });
        stateTools.syncTree(incoming, io);
        stateTools.syncDirectory(backupDir, io);
        if (stateTools.snapshot(original, io).treeHash !== target.local.treeHash ||
            stateTools.snapshot(incoming, io).treeHash !== target.upstream.treeHash ||
            stateTools.snapshot(target.source, io).treeHash !== target.upstream.treeHash ||
            stateTools.snapshot(target.destination, io).treeHash !== target.local.treeHash) {
          throw new Error("Skill changed during staging; refusing overwrite.");
        }
        mutation.operation.current.phase = "swapping";
        mutation.record();
        io.renameSync(target.destination, displaced);
        moved = true;
        stateTools.syncDirectory(path.dirname(target.destination), io);
        stateTools.syncDirectory(backupDir, io);
        if (stateTools.snapshot(displaced, io).treeHash !== target.local.treeHash) throw new Error("Destination changed during swap.");
        io.renameSync(incoming, target.destination);
        installed = true;
        stateTools.syncDirectory(path.dirname(target.destination), io);
        stateTools.syncDirectory(backupDir, io);
        mutation.operation.current.phase = "swapped";
        mutation.record();
        state.roots[target.root][target.skill] = stateTools.receipt(target.upstream, plan.packageVersion);
        receiptChanged = true;
        stateTools.writeState(plan.projectDir, state, io, { durable: true });
        mutation.operation.current.phase = "committed";
        mutation.operation.completed.push({ root: target.root, skill: target.skill });
        mutation.record();
      } catch (error) {
        try {
          if (installed) {
            if (stateTools.snapshot(target.destination, io).treeHash !== target.upstream.treeHash) {
              throw new Error("Replacement changed after swap; refusing destructive rollback.");
            }
            io.rmSync(target.destination, { recursive: true, force: true });
          }
          if (moved) io.renameSync(displaced, target.destination);
          if (installed || moved) {
            stateTools.syncDirectory(path.dirname(target.destination), io);
            stateTools.syncDirectory(backupDir, io);
          }
          if (receiptChanged) {
            try {
              state = JSON.parse(before);
            } catch (parseError) {
              throw new Error(`Cannot restore receipt snapshot: ${parseError.message}`);
            }
            stateTools.writeState(plan.projectDir, state, io, { durable: true });
          }
          mutation.operation.completed = mutation.operation.completed.filter((item) => item.root !== target.root || item.skill !== target.skill);
          mutation.operation.current.phase = "rolled-back";
        } catch (rollbackError) {
          recoveryRequired = true;
          error.message += `\nRollback failed: ${rollbackError.message}`;
        }
        result.failed = { root: target.root, skill: target.skill, recoveryRequired, recoveryDirectory: backupDir };
        throw error;
      }
      result.completed.push({ root: target.root, skill: target.skill });
      activeTarget = null;
      log(`Updated ${target.root}/${target.skill}. Backup: ${original}`);
    }
    mutation.finish();
    return result;
  } catch (error) {
    recoveryRequired = recoveryRequired || error.recoveryRequired === true || mutation?.operation.status === "recovery-required";
    if (!result.failed && activeTarget) result.failed = { root: activeTarget.root, skill: activeTarget.skill };
    result.unattempted = plan.targets.slice(attempted).map(({ root, skill }) => ({ root, skill }));
    try {
      if (mutation) {
        const status = result.failed || result.unattempted.length ? "rolled-back" : "complete";
        mutation.finish(recoveryRequired ? "recovery-required" : status);
      } else {
        // Setup can fail after acquiring a lock but before returning the mutation.
        try { stateTools.assertNoPendingOperation(plan.projectDir, io); }
        catch { recoveryRequired = true; }
      }
    } catch (journalError) {
      recoveryRequired = true;
      error.message += `\nJournal/lock requires manual recovery: ${journalError.message}`;
    }
    result.recoveryRequired = recoveryRequired;
    if (result.failed) result.failed.recoveryRequired = recoveryRequired;
    const identities = (items) => items.map((item) => `${item.root}/${item.skill}`).join(", ") || "none";
    error.message += `\nCompleted: ${identities(result.completed)}.`;
    error.message += `\nFailed: ${identities(result.failed ? [result.failed] : [])}.`;
    error.message += `\nSkipped: ${identities(result.skipped)}.`;
    error.message += `\nUnattempted: ${identities(result.unattempted)}.`;
    error.message += `\nRecovery required: ${recoveryRequired ? "yes" : "no"}.`;
    error.message += `\nBackups: ${result.backups.map((item) => item.path).join(", ") || "none completed"}. Inspect .sb-kit/operation.json before retrying.`;
    error.updateResult = result;
    throw error;
  }
}

async function runUpdate(projectDir, packageDir, prompts, { io = fs, log = console.log } = {}) {
  stateTools.readState(projectDir, io);
  stateTools.assertNoPendingOperation(projectDir, io);
  const rootChoice = await prompts.select({
    message: "Choose installed roots to update:", initialValue: ".agents",
    options: [
      { value: ".agents", label: ".agents only (default)" },
      { value: ".claude", label: ".claude only" },
      { value: "both", label: "Both roots (explicit opt-in)" },
    ],
  });
  if (prompts.isCancel(rootChoice)) { prompts.cancel("Update cancelled."); return null; }
  if (![...stateTools.ROOTS, "both"].includes(rootChoice)) throw new Error("Invalid update roots.");
  const roots = rootChoice === "both" ? stateTools.ROOTS : [rootChoice];
  const known = new Set(stateTools.inventory(packageDir, ".agents", io));
  const options = {};
  const candidates = new Map();
  for (const root of roots) {
    options[root] = [];
    for (const skill of stateTools.inventory(projectDir, root, io)) {
      if (!known.has(skill)) continue;
      const value = `${root}:${skill}`;
      stateTools.snapshot(stateTools.skillPath(projectDir, root, skill), io);
      candidates.set(value, { root, skill });
      options[root].push({ value, label: skill });
    }
    if (!options[root].length) delete options[root];
  }
  if (!candidates.size) { log("No installed packaged skills eligible for update; nothing written."); return null; }
  const selection = await prompts.groupMultiselect({ message: "Choose installed skills to update:", options, required: true });
  if (prompts.isCancel(selection) || !Array.isArray(selection) || !selection.length) { prompts.cancel("Update cancelled."); return null; }
  if (selection.some((value) => !candidates.has(value))) throw new Error("Invalid update selection.");
  const plan = planUpdate(projectDir, packageDir, selection.map((value) => candidates.get(value)), { io });
  log(renderUpdate(plan));
  if (!plan.targets.length) return { completed: [], failed: null, skipped: plan.skipped, backups: [] };
  let allowOverwrite = false;
  if (plan.targets.some((target) => target.needsOverwriteConsent)) {
    const consent = await prompts.confirm({ message: "Overwrite the selected Unknown / locally modified skills? Their complete originals will be backed up.", initialValue: false });
    if (prompts.isCancel(consent) || consent !== true) { prompts.cancel("Update cancelled; nothing written."); return null; }
    allowOverwrite = true;
  }
  const approved = await prompts.confirm({ message: "Create retained backups and apply exactly this preview?", initialValue: false });
  if (prompts.isCancel(approved) || approved !== true) { prompts.cancel("Update cancelled; nothing written."); return null; }
  return applyUpdate(plan, { approved: true, allowOverwrite, io, log });
}

module.exports = { changedFiles, planUpdate, renderUpdate, applyUpdate, runUpdate };
