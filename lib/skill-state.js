const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOTS = [".agents", ".claude"];
const SHA256 = /^[a-f0-9]{64}$/;

function assertName(name) {
  if (typeof name !== "string" || !/^[a-z0-9][a-z0-9._-]*$/i.test(name) ||
      ["__proto__", "constructor", "prototype"].includes(name.toLowerCase())) {
    throw new Error("Unsafe skill name.");
  }
}

function assertRoot(root) {
  if (!ROOTS.includes(root)) throw new Error("Unsupported skill root.");
}

function statSafe(file, io = fs) {
  const absolute = path.resolve(file);
  const base = path.parse(absolute).root;
  let current = base;
  let result = null;
  for (const segment of absolute.slice(base.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    try {
      result = io.lstatSync(current);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      result = null;
      continue;
    }
    if (result.isSymbolicLink() || (!result.isDirectory() && !result.isFile())) {
      throw new Error(`Unsafe link or special file: ${current}`);
    }
    if (current !== absolute && !result.isDirectory()) {
      throw new Error(`Not a directory: ${current}`);
    }
  }
  return result;
}

function managedPath(projectDir, ...parts) {
  const base = path.resolve(projectDir);
  const result = path.resolve(base, ...parts);
  const relative = path.relative(base, result);
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
    throw new Error("Path escapes the project root.");
  }
  return result;
}

function skillPath(projectDir, root, name) {
  assertRoot(root);
  assertName(name);
  return managedPath(projectDir, root, "skills", name);
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function treeHash(files, directories) {
  return hash(JSON.stringify({ files, directories }));
}

function snapshot(dir, io = fs) {
  const stat = statSafe(dir, io);
  if (!stat?.isDirectory()) throw new Error(`Missing skill directory: ${dir}`);
  const files = [];
  const directories = [];
  function walk(current, prefix) {
    for (const name of io.readdirSync(current).sort()) {
      if (/[\\\\:\x00-\x1f\x7f]/.test(name)) throw new Error("Unsafe file name.");
      const file = path.join(current, name);
      const relative = prefix ? `${prefix}/${name}` : name;
      const item = statSafe(file, io);
      if (!item) throw new Error("Skill changed while reading its snapshot.");
      if (item.isDirectory()) {
        directories.push(relative);
        walk(file, relative);
      } else {
        const bytes = io.readFileSync(file);
        files.push({ path: relative, size: bytes.length, sha256: hash(bytes) });
      }
    }
  }
  walk(dir, "");
  files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  directories.sort();
  return { files, directories, treeHash: treeHash(files, directories) };
}

function validRelative(value) {
  return typeof value === "string" && value.length > 0 &&
    !/[\\:\x00-\x1f]/.test(value) &&
    value.split("/").every((part) => part && part !== "." && part !== "..");
}

function validateState(state) {
  if (!state || state.schemaVersion !== 1 || !state.roots || Array.isArray(state.roots)) {
    throw new Error("Invalid or unsupported sb-kit receipt schema.");
  }
  for (const root of Object.keys(state.roots)) {
    assertRoot(root);
    const entries = state.roots[root];
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) throw new Error("Invalid receipt root.");
    for (const [name, entry] of Object.entries(entries)) {
      assertName(name);
      if (!entry || typeof entry.packageVersion !== "string" ||
          !entry.packageVersion || entry.packageVersion.length > 100 ||
          !Array.isArray(entry.files) || !Array.isArray(entry.directories) || !SHA256.test(entry.treeHash)) {
        throw new Error("Invalid skill receipt.");
      }
      const seen = new Set();
      for (const file of entry.files) {
        if (!file || !validRelative(file.path) || !SHA256.test(file.sha256) ||
            !Number.isSafeInteger(file.size) || file.size < 0 || seen.has(file.path)) {
          throw new Error("Invalid receipt file record.");
        }
        seen.add(file.path);
      }
      for (const dir of entry.directories) {
        if (!validRelative(dir) || seen.has(dir)) throw new Error("Invalid receipt directory record.");
        seen.add(dir);
      }
      if (treeHash(entry.files, entry.directories) !== entry.treeHash) throw new Error("Receipt digest mismatch.");
    }
  }
  for (const root of ROOTS) if (!state.roots[root]) throw new Error("Receipt root is missing.");
  return state;
}

function metadataPath(projectDir, name) {
  return managedPath(projectDir, ".sb-kit", name);
}

function readJson(file, io = fs) {
  const stat = statSafe(file, io);
  if (!stat) return undefined;
  if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw new Error("Invalid or oversized sb-kit metadata.");
  try {
    return JSON.parse(io.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read sb-kit metadata ${file}: ${error.message}`);
  }
}

function readState(projectDir, io = fs) {
  const file = metadataPath(projectDir, "state.json");
  const state = readJson(file, io);
  return state === undefined ? { schemaVersion: 1, roots: { ".agents": {}, ".claude": {} } } : validateState(state);
}

function syncFile(file, io = fs) {
  const stat = statSafe(file, io);
  if (!stat?.isFile()) throw new Error(`Not a regular file for durability flush: ${file}`);
  const fd = io.openSync(file, "r+");
  try { io.fsyncSync(fd); } finally { io.closeSync(fd); }
}

function syncDirectory(dir, io = fs) {
  let fd;
  try {
    if (!statSafe(dir, io)?.isDirectory()) throw new Error("Not a directory");
    fd = io.openSync(dir, "r");
    io.fsyncSync(fd);
  } catch (error) {
    throw new Error(`Strict durability directory barrier failed at ${dir}: ${error.message}`);
  } finally {
    if (fd !== undefined) io.closeSync(fd);
  }
}

function syncAncestors(dir, projectDir, io = fs) {
  const root = path.resolve(projectDir);
  let current = path.resolve(dir);
  const relative = path.relative(root, current);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Durability path escapes project.");
  while (true) {
    syncDirectory(current, io);
    if (current === root) break;
    current = path.dirname(current);
  }
}

function syncTree(dir, io = fs) {
  if (!statSafe(dir, io)?.isDirectory()) throw new Error(`Not a skill directory: ${dir}`);
  for (const name of io.readdirSync(dir).sort()) {
    const file = path.join(dir, name);
    if (statSafe(file, io)?.isDirectory()) syncTree(file, io);
    else syncFile(file, io);
  }
  syncDirectory(dir, io);
}

function atomicJson(file, value, io = fs, { durable = false } = {}) {
  statSafe(file, io);
  statSafe(path.dirname(file), io);
  io.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    io.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    if (durable) syncFile(temp, io);
    io.renameSync(temp, file);
    if (durable) syncDirectory(path.dirname(file), io);
  } finally {
    if (statSafe(temp, io)) io.unlinkSync(temp);
  }
}

function writeState(projectDir, state, io = fs, options = {}) {
  atomicJson(metadataPath(projectDir, "state.json"), validateState(state), io, options);
}

function readOperation(projectDir, io = fs) {
  const operation = readJson(metadataPath(projectDir, "operation.json"), io);
  if (operation !== undefined && (!operation || typeof operation !== "object" || Array.isArray(operation) ||
      !/^[a-f0-9-]{36}$/.test(operation.id) ||
      !["active", "complete", "rolled-back", "recovery-required"].includes(operation.status))) {
    throw new Error("Invalid sb-kit operation journal.");
  }
  return operation;
}

function assertNoPendingOperation(projectDir, io = fs) {
  const operation = readOperation(projectDir, io);
  if (statSafe(metadataPath(projectDir, "mutation.lock"), io) ||
      (operation && ["active", "recovery-required"].includes(operation.status))) {
    throw new Error("An sb-kit mutation is pending. Inspect .sb-kit/operation.json and recover manually before retrying.");
  }
}

function beginMutation(projectDir, type, io = fs, { durable = false } = {}) {
  if (durable) syncDirectory(path.resolve(projectDir), io);
  readState(projectDir, io);
  assertNoPendingOperation(projectDir, io);
  const lock = metadataPath(projectDir, "mutation.lock");
  statSafe(path.dirname(lock), io);
  io.mkdirSync(path.dirname(lock), { recursive: true });
  const fd = io.openSync(lock, "wx");
  try { if (durable) io.fsyncSync(fd); } finally { io.closeSync(fd); }
  const operation = { id: crypto.randomUUID(), type, status: "active", completed: [], current: null };
  let recoveryPending = false;
  function record() {
    atomicJson(metadataPath(projectDir, "operation.json"), operation, io, { durable });
  }
  try {
    if (durable) syncAncestors(path.dirname(lock), projectDir, io);
    readState(projectDir, io);
    record();
  } catch (error) {
    // No target mutation has begun. A leftover lock fails closed on retry.
    if (!durable) io.unlinkSync(lock);
    throw error;
  }
  return {
    operation,
    record,
    finish(status = "complete") {
      // Cleanup uncertainty is sticky: retry cannot publish a terminal journal.
      if (recoveryPending) status = "recovery-required";
      operation.status = status;
      record();
      if (status !== "recovery-required") {
        try {
          io.unlinkSync(lock);
          if (durable) syncDirectory(path.dirname(lock), io);
        } catch (error) {
          if (!durable) throw error;
          recoveryPending = true;
          operation.status = "recovery-required";
          error.recoveryRequired = true;
          // The journal blocks mutations even if the deleted lock cannot be recreated.
          try { record(); }
          catch (journalError) {
            error.message += `\nCannot durably record recovery-required journal: ${journalError.message}`;
          }
          try {
            if (!statSafe(lock, io)) {
              const lockFd = io.openSync(lock, "wx");
              try { io.fsyncSync(lockFd); } finally { io.closeSync(lockFd); }
            }
            syncDirectory(path.dirname(lock), io);
          } catch (markerError) {
            error.message += `\nCannot durably restore mutation lock: ${markerError.message}`;
          }
          throw error;
        }
      }
    },
  };
}

function receipt(snapshotValue, packageVersion) {
  return { packageVersion, ...snapshotValue };
}

function inventory(projectDir, root, io = fs) {
  assertRoot(root);
  const dir = managedPath(projectDir, root, "skills");
  const stat = statSafe(dir, io);
  if (!stat) return [];
  if (!stat.isDirectory()) throw new Error(`Not a skill directory: ${dir}`);
  return io.readdirSync(dir).sort().filter((name) => statSafe(path.join(dir, name), io)?.isDirectory());
}

function provenance(local, upstream, baseline) {
  if (!baseline) return local.treeHash === upstream.treeHash ? "untracked-identical" : "unknown";
  const localChanged = local.treeHash !== baseline.treeHash;
  const upstreamChanged = upstream.treeHash !== baseline.treeHash;
  if (localChanged && upstreamChanged) return "both-changed";
  if (localChanged) return "local-modified";
  if (upstreamChanged) return "upstream-changed";
  return "unchanged";
}

module.exports = {
  ROOTS, assertName, assertRoot, statSafe, managedPath, skillPath, snapshot,
  readState, writeState, atomicJson, readOperation, assertNoPendingOperation,
  beginMutation, receipt, inventory, provenance, metadataPath,
  syncFile, syncDirectory, syncAncestors, syncTree,
};
