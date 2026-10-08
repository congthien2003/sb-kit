const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  ASSET_SKILLS,
  REPORT_SKILLS,
  SB_KIT_SKILLS,
  categorizedSkills,
  categoryOptions,
  chooseConflictMode,
  chooseSkills,
  createNextHonoProject,
  install,
  listSkills,
  parseCreateArgs,
  runCommand,
} = require("./cli");

function runInstall({ claude = false } = {}) {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "sb-kit-"));
  assert.strictEqual(install(SB_KIT_SKILLS, ".agents", target), true);
  if (claude) assert.strictEqual(install(SB_KIT_SKILLS, ".claude", target), true);

  return { target };
}

const CORE_ROLE_SKILLS = [
  "sk-excute-explorer",
  "sk-excute-researcher",
  "sk-excute-reviewer",
  "sk-excute-implementer",
];
const VISUALIZER_REFERENCE_FILES = [
  "system-change-report.md",
  "spec-visualization.md",
  "implementation-plan.md",
];
const stateTools = require("./lib/skill-state");
const { inspectProject, renderDoctor } = require("./lib/doctor");
const { presetSelections, resolveCompanions, chooseInstallSelection } = require("./lib/presets");
const { planUpdate, renderUpdate, applyUpdate, runUpdate } = require("./lib/update");

// Source-level/control-flow fixtures emulate directory fsync support, including on
// hosts where Node cannot open directory handles. This is NOT platform durability proof.
function durabilityTestIO(onFlush = () => {}) {
  const io = Object.create(fs);
  const directoryFd = -12345;
  let directoryPath;
  const files = new Map();
  io.events = [];
  io.openSync = (file, flags, mode) => {
    if (flags === "r" && fs.lstatSync(file).isDirectory()) {
      directoryPath = file;
      return directoryFd;
    }
    const fd = fs.openSync(file, flags, mode);
    files.set(fd, file);
    return fd;
  };
  io.fsyncSync = (fd) => {
    const event = { kind: fd === directoryFd ? "directory" : "file", path: fd === directoryFd ? directoryPath : files.get(fd) };
    io.events.push(event);
    onFlush(event);
    if (fd !== directoryFd) fs.fsyncSync(fd);
  };
  io.closeSync = (fd) => {
    if (fd === directoryFd) { directoryPath = undefined; return; }
    files.delete(fd);
    fs.closeSync(fd);
  };
  io.renameSync = (source, destination) => {
    const metadata = path.basename(destination) === "operation.json" ? parseJson(fs.readFileSync(source, "utf8"), source) : null;
    io.events.push({ kind: "rename", source, destination, phase: metadata?.current?.phase, status: metadata?.status });
    fs.renameSync(source, destination);
  };
  return io;
}

function updateFixture(target) {
  captureLogs(() => install(["sk-doc", "sk-explain"], ".agents", target));
  captureLogs(() => install(["sk-doc"], ".claude", target));
  const packageDir = path.join(target, "package");
  const source = path.join(packageDir, ".agents", "skills", "sk-doc");
  fs.mkdirSync(path.dirname(source), { recursive: true });
  fs.cpSync(path.join(__dirname, ".agents", "skills", "sk-doc"), source, { recursive: true });
  fs.writeFileSync(path.join(source, "SKILL.md"), "# package update\n");
  return { packageDir, source, destination: path.join(target, ".agents", "skills", "sk-doc") };
}

withDisposableTarget("sb-kit-update-", (target) => {
  const { packageDir, destination } = updateFixture(target);
  const sentinel = path.join(destination, "local.txt");
  fs.writeFileSync(sentinel, "local-only original");
  const original = stateTools.snapshot(destination);
  const other = stateTools.snapshot(path.join(target, ".agents", "skills", "sk-explain"));
  const mirror = stateTools.snapshot(path.join(target, ".claude", "skills", "sk-doc"));
  const before = fs.readFileSync(path.join(target, ".sb-kit", "state.json"));
  const plan = planUpdate(target, packageDir, [{ root: ".agents", skill: "sk-doc" }]);
  assert.strictEqual(plan.targets[0].status, "both-changed");
  assert.match(renderUpdate(plan), /Offline/);
  assert.deepStrictEqual(fs.readFileSync(path.join(target, ".sb-kit", "state.json")), before);
  assert.throws(() => applyUpdate(plan), /approval/);
  assert.throws(() => applyUpdate(plan, { approved: true }), /overwrite consent/);
  const io = durabilityTestIO();
  const result = applyUpdate(plan, { approved: true, allowOverwrite: true, io, log: () => {} });
  assert.strictEqual(result.completed.length, 1);
  const swapIndex = io.events.findIndex((event) => event.kind === "rename" && event.source === destination);
  assert.ok(swapIndex > 0);
  const beforeSwap = io.events.slice(0, swapIndex);
  for (const file of original.files) {
    assert.ok(beforeSwap.some((event) => event.kind === "file" && event.path === path.join(result.backups[0].path, ...file.path.split("/"))));
  }
  const backupDir = path.dirname(result.backups[0].path);
  const recoveryFlush = beforeSwap.findIndex((event) => event.kind === "file" && event.path === path.join(backupDir, "recovery.md"));
  assert.ok(recoveryFlush >= 0);
  for (const file of plan.targets[0].upstream.files) {
    assert.ok(beforeSwap.some((event) => event.kind === "file" && event.path === path.join(backupDir, "incoming", ...file.path.split("/"))));
  }
  for (let ancestor = backupDir; ; ancestor = path.dirname(ancestor)) {
    assert.ok(beforeSwap.slice(recoveryFlush + 1).some((event) => event.kind === "directory" && event.path === ancestor));
    if (ancestor === target) break;
  }
  assert.ok(beforeSwap.some((event) => event.kind === "rename" && event.phase === "swapping"));
  for (let index = 0; index < io.events.length; index++) {
    const event = io.events[index];
    if (event.kind === "rename" && ["state.json", "operation.json", "before-state.json"].includes(path.basename(event.destination))) {
      assert.strictEqual(io.events[index - 1].kind, "file");
      assert.strictEqual(io.events[index - 1].path, event.source);
      assert.strictEqual(io.events[index + 1].kind, "directory");
      assert.strictEqual(io.events[index + 1].path, path.dirname(event.destination));
    }
  }
  assert.strictEqual(stateTools.snapshot(result.backups[0].path).treeHash, original.treeHash);
  assert.strictEqual(fs.readFileSync(path.join(result.backups[0].path, "local.txt"), "utf8"), "local-only original");
  assert.strictEqual(stateTools.snapshot(path.join(target, ".agents", "skills", "sk-explain")).treeHash, other.treeHash);
  assert.strictEqual(stateTools.snapshot(path.join(target, ".claude", "skills", "sk-doc")).treeHash, mirror.treeHash);
  assert.ok(!fs.existsSync(sentinel));
  assert.strictEqual(stateTools.readState(target).roots[".agents"]["sk-doc"].treeHash, stateTools.snapshot(destination).treeHash);
  assert.strictEqual(planUpdate(target, packageDir, [{ root: ".agents", skill: "sk-doc" }]).targets.length, 0);
});

withDisposableTarget("sb-kit-update-unsupported-fsync-", (target) => {
  const { packageDir } = updateFixture(target);
  const before = stateTools.snapshot(target);
  const plan = planUpdate(target, packageDir, [{ root: ".agents", skill: "sk-doc" }]);
  const io = durabilityTestIO((event) => {
    if (event.kind === "directory") throw new Error("unsupported directory fsync");
  });
  io.cpSync = () => { throw new Error("copy must not be attempted"); };
  let failure;
  try { applyUpdate(plan, { approved: true, io, log: () => {} }); }
  catch (error) { failure = error; }
  assert.match(failure.message, /Strict durability directory barrier failed/);
  assert.strictEqual(failure.updateResult.failed, null);
  assert.strictEqual(failure.updateResult.recoveryRequired, false);
  assert.deepStrictEqual(failure.updateResult.unattempted, [{ root: ".agents", skill: "sk-doc" }]);
  assert.ok(!io.events.some((event) => event.kind === "rename" || event.kind === "file"));
  assert.strictEqual(stateTools.snapshot(target).treeHash, before.treeHash);
});

withDisposableTarget("sb-kit-update-lock-flush-", (target) => {
  const { packageDir, destination } = updateFixture(target);
  const before = stateTools.snapshot(destination);
  const plan = planUpdate(target, packageDir, [{ root: ".agents", skill: "sk-doc" }]);
  const io = durabilityTestIO((event) => {
    if (event.kind === "file" && path.basename(event.path) === "mutation.lock") throw new Error("injected lock flush failure");
  });
  let failure;
  try { applyUpdate(plan, { approved: true, io, log: () => {} }); }
  catch (error) { failure = error; }
  assert.match(failure.message, /injected lock flush failure/);
  assert.strictEqual(failure.updateResult.failed, null);
  assert.strictEqual(failure.updateResult.recoveryRequired, true);
  assert.strictEqual(failure.updateResult.unattempted.length, 1);
  assert.strictEqual(stateTools.snapshot(destination).treeHash, before.treeHash);
  assert.throws(() => stateTools.assertNoPendingOperation(target), /pending/);
  assert.strictEqual(inspectProject(target, __dirname).exitCode, 2);
});

for (const barrier of ["backup-file", "backup-directory", "incoming-file", "swapping-journal", "receipt-file", "post-swap-directory"]) {
  withDisposableTarget(`sb-kit-update-flush-${barrier}-`, (target) => {
    const { packageDir, destination } = updateFixture(target);
    const original = stateTools.snapshot(destination);
    const before = stateTools.readState(target);
    const plan = planUpdate(target, packageDir, [{ root: ".agents", skill: "sk-doc" }]);
    let injected = false;
    const io = durabilityTestIO((event) => {
      if (injected) return;
      const name = path.basename(event.path);
      const match = barrier === "backup-file" ? event.kind === "file" && event.path.includes(`${path.sep}original${path.sep}`) :
        barrier === "backup-directory" ? event.kind === "directory" && name === "original" :
        barrier === "incoming-file" ? event.kind === "file" && event.path.includes(`${path.sep}incoming${path.sep}`) :
        barrier === "swapping-journal" ? event.kind === "file" && name.startsWith("operation.json.") && parseJson(fs.readFileSync(event.path, "utf8"), event.path).current?.phase === "swapping" :
        barrier === "receipt-file" ? event.kind === "file" && name.startsWith("state.json.") :
        event.kind === "directory" && event.path === path.dirname(destination) && io.events.some((item) => item.kind === "rename" && path.basename(item.source) === "incoming");
      if (match) { injected = true; throw new Error("injected durability flush failure"); }
    });
    let failure;
    try { applyUpdate(plan, { approved: true, io, log: () => {} }); }
    catch (error) { failure = error; }
    assert.ok(injected);
    assert.match(failure.message, /injected durability flush failure/);
    assert.strictEqual(failure.updateResult.recoveryRequired, false);
    assert.strictEqual(stateTools.snapshot(destination).treeHash, original.treeHash);
    assert.deepStrictEqual(stateTools.readState(target), before);
    if (!["receipt-file", "post-swap-directory"].includes(barrier)) {
      assert.ok(!io.events.some((event) => event.kind === "rename" && event.source === destination));
    }
    stateTools.assertNoPendingOperation(target);
  });
}

for (const failure of ["backup", "copy", "swap", "receipt"]) {
  withDisposableTarget(`sb-kit-update-${failure}-`, (target) => {
    const { packageDir, destination } = updateFixture(target);
    const original = stateTools.snapshot(destination);
    const before = stateTools.readState(target);
    const plan = planUpdate(target, packageDir, [{ root: ".agents", skill: "sk-doc" }]);
    const io = durabilityTestIO();
    let injected = false;
    io.cpSync = (source, dest, options) => {
      const trigger = failure === "backup" ? "original" : failure === "copy" ? "incoming" : null;
      if (!injected && trigger && path.basename(dest) === trigger) {
        injected = true;
        throw new Error("injected copy failure");
      }
      return fs.cpSync(source, dest, options);
    };
    io.renameSync = (source, dest) => {
      const trigger = failure === "swap" ? path.basename(source) === "incoming" :
        failure === "receipt" && path.basename(dest) === "state.json";
      if (!injected && trigger) { injected = true; throw new Error("injected rename failure"); }
      return fs.renameSync(source, dest);
    };
    assert.throws(() => applyUpdate(plan, { approved: true, io, log: () => {} }), /injected/);
    assert.ok(injected);
    assert.strictEqual(stateTools.snapshot(destination).treeHash, original.treeHash);
    assert.deepStrictEqual(stateTools.readState(target), before);
    stateTools.assertNoPendingOperation(target);
  });
}

withDisposableTarget("sb-kit-update-concurrent-", (target) => {
  const { packageDir, destination } = updateFixture(target);
  const plan = planUpdate(target, packageDir, [{ root: ".agents", skill: "sk-doc" }]);
  fs.writeFileSync(path.join(destination, "SKILL.md"), "new concurrent edit");
  assert.throws(() => applyUpdate(plan, { approved: true, io: durabilityTestIO(), log: () => {} }), /changed since preview/);
  assert.strictEqual(fs.readFileSync(path.join(destination, "SKILL.md"), "utf8"), "new concurrent edit");
});

withDisposableTarget("sb-kit-update-partial-", (target) => {
  const { packageDir, destination } = updateFixture(target);
  const mirror = path.join(target, ".claude", "skills", "sk-doc");
  const mirrorBefore = stateTools.snapshot(mirror);
  const thirdSource = path.join(packageDir, ".agents", "skills", "sk-explain");
  fs.cpSync(path.join(target, ".agents", "skills", "sk-explain"), thirdSource, { recursive: true });
  fs.writeFileSync(path.join(thirdSource, "SKILL.md"), "# third package update\n");
  const thirdBefore = stateTools.snapshot(path.join(target, ".agents", "skills", "sk-explain"));
  captureLogs(() => install(["sk-debug"], ".agents", target));
  fs.cpSync(path.join(target, ".agents", "skills", "sk-debug"), path.join(packageDir, ".agents", "skills", "sk-debug"), { recursive: true });
  const plan = planUpdate(target, packageDir, [
    { root: ".agents", skill: "sk-doc" }, { root: ".claude", skill: "sk-doc" },
    { root: ".agents", skill: "sk-explain" }, { root: ".agents", skill: "sk-debug" },
  ]);
  const io = durabilityTestIO();
  let injected = false;
  io.renameSync = (source, dest) => {
    if (!injected && path.basename(source) === "incoming" && source.includes(`${path.sep}.claude${path.sep}`)) {
      injected = true;
      throw new Error("second target failure");
    }
    return fs.renameSync(source, dest);
  };
  let failure;
  try { applyUpdate(plan, { approved: true, io, log: () => {} }); }
  catch (error) { failure = error; }
  assert.ok(failure);
  assert.strictEqual(failure.updateResult.completed.length, 1);
  assert.strictEqual(failure.updateResult.failed.root, ".claude");
  assert.deepStrictEqual(failure.updateResult.unattempted, [{ root: ".agents", skill: "sk-explain" }]);
  assert.strictEqual(failure.updateResult.skipped[0].skill, "sk-debug");
  assert.strictEqual(failure.updateResult.recoveryRequired, false);
  assert.match(failure.message, /Failed: \.claude\/sk-doc/);
  assert.match(failure.message, /Skipped: \.agents\/sk-debug/);
  assert.match(failure.message, /Unattempted: \.agents\/sk-explain/);
  assert.strictEqual(stateTools.snapshot(path.join(target, ".agents", "skills", "sk-explain")).treeHash, thirdBefore.treeHash);
  assert.strictEqual(stateTools.snapshot(destination).treeHash, plan.targets[0].upstream.treeHash);
  assert.strictEqual(stateTools.snapshot(mirror).treeHash, mirrorBefore.treeHash);
});

withDisposableTarget("sb-kit-update-rollback-failure-", (target) => {
  const { packageDir } = updateFixture(target);
  const plan = planUpdate(target, packageDir, [{ root: ".agents", skill: "sk-doc" }]);
  const io = durabilityTestIO();
  io.renameSync = (source, dest) => {
    if (["incoming", "displaced"].includes(path.basename(source))) throw new Error("injected swap/rollback failure");
    return fs.renameSync(source, dest);
  };
  let failure;
  try { applyUpdate(plan, { approved: true, io, log: () => {} }); }
  catch (error) { failure = error; }
  assert.match(failure.message, /Rollback failed/);
  assert.strictEqual(failure.updateResult.failed.recoveryRequired, true);
  assert.ok(fs.existsSync(failure.updateResult.backups[0].path));
  assert.strictEqual(stateTools.readOperation(target).status, "recovery-required");
  assert.strictEqual(inspectProject(target, __dirname).exitCode, 2);
});

for (const variant of ["target-failure", "operation-finalization"]) {
  withDisposableTarget(`sb-kit-update-finalize-${variant}-`, (target) => {
    const { packageDir, destination } = updateFixture(target);
    const original = stateTools.snapshot(destination);
    const plan = planUpdate(target, packageDir, [{ root: ".agents", skill: "sk-doc" }]);
    const io = durabilityTestIO();
    const rename = io.renameSync;
    io.cpSync = (source, dest, options) => {
      if (variant === "target-failure" && path.basename(dest) === "incoming") throw new Error("injected target failure");
      return fs.cpSync(source, dest, options);
    };
    io.renameSync = (source, dest) => {
      if (path.basename(dest) === "operation.json" && parseJson(fs.readFileSync(source, "utf8"), source).status !== "active") {
        throw new Error("injected journal finalization failure");
      }
      return rename(source, dest);
    };
    let failure;
    try { applyUpdate(plan, { approved: true, io, log: () => {} }); }
    catch (error) { failure = error; }
    assert.match(failure.message, /Journal\/lock requires manual recovery/);
    assert.strictEqual(failure.updateResult.recoveryRequired, true);
    assert.match(failure.message, /Recovery required: yes/);
    if (variant === "target-failure") {
      assert.strictEqual(failure.updateResult.failed.recoveryRequired, true);
      assert.strictEqual(stateTools.snapshot(destination).treeHash, original.treeHash);
    } else {
      assert.strictEqual(failure.updateResult.failed, null);
      assert.strictEqual(failure.updateResult.completed.length, 1);
      assert.strictEqual(stateTools.snapshot(destination).treeHash, plan.targets[0].upstream.treeHash);
    }
    assert.strictEqual(inspectProject(target, __dirname).exitCode, 2);
    assert.throws(() => stateTools.assertNoPendingOperation(target), /pending/);
  });
}

for (const outcome of ["complete", "rolled-back"]) {
  withDisposableTarget(`sb-kit-update-cleanup-${outcome}-`, (target) => {
    const { packageDir, destination } = updateFixture(target);
    const original = stateTools.snapshot(destination);
    const plan = planUpdate(target, packageDir, [{ root: ".agents", skill: "sk-doc" }]);
    const lock = path.join(target, ".sb-kit", "mutation.lock");
    let unlinked = false;
    let flushFailed = false;
    let recreationFailed = false;
    let cleanupEventIndex;
    const io = durabilityTestIO((event) => {
      if (unlinked && !flushFailed && event.kind === "directory" && event.path === path.dirname(lock)) {
        flushFailed = true;
        throw new Error("injected post-unlink flush failure");
      }
    });
    const open = io.openSync;
    io.openSync = (file, flags, mode) => {
      if (file === lock && flags === "wx" && unlinked) {
        recreationFailed = true;
        throw new Error("injected lock recreation failure");
      }
      return open(file, flags, mode);
    };
    io.unlinkSync = (file) => {
      fs.unlinkSync(file);
      if (file === lock) { unlinked = true; cleanupEventIndex = io.events.length; }
    };
    io.cpSync = (source, dest, options) => {
      if (outcome === "rolled-back" && path.basename(dest) === "incoming") throw new Error("injected target failure");
      return fs.cpSync(source, dest, options);
    };
    let failure;
    try { applyUpdate(plan, { approved: true, io, log: () => {} }); }
    catch (error) { failure = error; }
    assert.ok(flushFailed && recreationFailed);
    assert.strictEqual(fs.existsSync(lock), false);
    assert.strictEqual(failure.updateResult.recoveryRequired, true);
    assert.match(failure.message, /Recovery required: yes/);
    assert.strictEqual(stateTools.readOperation(target).status, "recovery-required");
    const subsequentJournals = io.events.slice(cleanupEventIndex).filter((event) => event.kind === "rename" && path.basename(event.destination) === "operation.json");
    assert.ok(subsequentJournals.length >= (outcome === "complete" ? 2 : 1));
    assert.ok(subsequentJournals.every((event) => event.status === "recovery-required"));
    if (outcome === "rolled-back") {
      assert.strictEqual(failure.updateResult.failed.recoveryRequired, true);
      assert.strictEqual(stateTools.snapshot(destination).treeHash, original.treeHash);
    } else {
      assert.strictEqual(failure.updateResult.failed, null);
      assert.strictEqual(failure.updateResult.completed.length, 1);
      assert.strictEqual(stateTools.snapshot(destination).treeHash, plan.targets[0].upstream.treeHash);
    }
    assert.strictEqual(inspectProject(target, __dirname).exitCode, 2);
    assert.throws(() => stateTools.assertNoPendingOperation(target), /pending/);
    assert.throws(() => install(["sk-explain"], ".agents", target), /pending/);
  });
}

withDisposableTarget("sb-kit-cleanup-sticky-retry-", (target) => {
  let unlinked = false;
  let injected = false;
  const io = durabilityTestIO((event) => {
    if (unlinked && !injected && event.kind === "directory") {
      injected = true;
      throw new Error("injected cleanup flush failure");
    }
  });
  const open = io.openSync;
  io.openSync = (file, flags, mode) => {
    if (unlinked && path.basename(file) === "mutation.lock" && flags === "wx") throw new Error("injected lock recreation failure");
    return open(file, flags, mode);
  };
  io.unlinkSync = (file) => {
    fs.unlinkSync(file);
    if (path.basename(file) === "mutation.lock") unlinked = true;
  };
  const mutation = stateTools.beginMutation(target, "update", io, { durable: true });
  assert.throws(() => mutation.finish(), /injected cleanup flush failure/);
  for (const status of ["complete", "rolled-back"]) {
    mutation.finish(status);
    assert.strictEqual(stateTools.readOperation(target).status, "recovery-required");
    assert.throws(() => stateTools.assertNoPendingOperation(target), /pending/);
  }
});

withDisposableTarget("sb-kit-interrupted-", (target) => {
  updateFixture(target);
  const mutation = stateTools.beginMutation(target, "update", durabilityTestIO(), { durable: true });
  assert.strictEqual(mutation.operation.status, "active");
  assert.strictEqual(inspectProject(target, __dirname).exitCode, 2);
  assert.throws(() => install(["sk-explain"], ".agents", target), /pending/);
  // Simulate an abandoned operation; only this disposable fixture is removed in finally.
});

withDisposableTarget("sb-kit-doctor-", (target) => {
  const readOnlyIO = Object.create(fs);
  for (const method of ["writeFileSync", "mkdirSync", "renameSync", "rmSync", "unlinkSync", "cpSync", "openSync"]) {
    readOnlyIO[method] = () => { throw new Error("Doctor attempted a mutation"); };
  }
  const empty = inspectProject(target, __dirname, { io: readOnlyIO });
  assert.strictEqual(empty.exitCode, 0);
  assert.deepStrictEqual(fs.readdirSync(target), []);
  captureLogs(() => install(["sk-doc"], ".agents", target));
  const before = fs.readFileSync(path.join(target, ".sb-kit", "state.json"));
  const report = inspectProject(target, __dirname, { io: readOnlyIO });
  assert.strictEqual(report.exitCode, 0);
  assert.strictEqual(report.skills[0].status, "unchanged");
  assert.match(renderDoctor(report), /Read-only/);
  assert.deepStrictEqual(fs.readFileSync(path.join(target, ".sb-kit", "state.json")), before);
  assert.ok(!fs.existsSync(path.join(target, ".claude")));
  captureLogs(() => install(["sk-doc"], ".claude", target));
  fs.writeFileSync(path.join(target, ".claude", "skills", "sk-doc", "SKILL.md"), "local edit");
  const edited = inspectProject(target, __dirname);
  assert.strictEqual(edited.exitCode, 1);
  assert.ok(edited.findings.some(({ code }) => code === "mirror-different"));
  assert.ok(edited.skills.some(({ status }) => status === "local-modified"));
  const stateFile = path.join(target, ".sb-kit", "state.json");
  fs.writeFileSync(stateFile, "{bad");
  const broken = inspectProject(target, __dirname);
  assert.strictEqual(broken.exitCode, 2);
  assert.strictEqual(fs.readFileSync(stateFile, "utf8"), "{bad");
  fs.writeFileSync(stateFile, "null");
  assert.strictEqual(inspectProject(target, __dirname).exitCode, 2);
  fs.unlinkSync(stateFile);
  fs.writeFileSync(path.join(target, ".sb-kit", "operation.json"), "null");
  assert.strictEqual(inspectProject(target, __dirname).exitCode, 2);
});

withDisposableTarget("sb-kit-doctor-legacy-", (target) => {
  const destination = path.join(target, ".agents", "skills", "sk-doc");
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(path.join(__dirname, ".agents", "skills", "sk-doc"), destination, { recursive: true });
  assert.strictEqual(inspectProject(target, __dirname).skills[0].status, "untracked-identical");
  fs.writeFileSync(path.join(destination, "local.txt"), "unknown origin");
  assert.strictEqual(inspectProject(target, __dirname).skills[0].status, "unknown");
  assert.ok(!fs.existsSync(path.join(target, ".sb-kit")));
});

function withDisposableTarget(prefix, callback) {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    return callback(target);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

withDisposableTarget("sb-kit-receipts-", (target) => {
  captureLogs(() => install(["sk-doc"], ".agents", target));
  const skill = path.join(target, ".agents", "skills", "sk-doc");
  const before = stateTools.readState(target);
  assert.strictEqual(before.schemaVersion, 1);
  assert.deepStrictEqual(before.roots[".claude"], {});
  assert.strictEqual(before.roots[".agents"]["sk-doc"].treeHash, stateTools.snapshot(skill).treeHash);
  assert.strictEqual(before.roots[".agents"]["sk-doc"].packageVersion, require("./package.json").version);
  fs.writeFileSync(path.join(skill, "local.txt"), "preserve me");
  captureLogs(() => install(["sk-doc"], ".agents", target));
  assert.deepStrictEqual(stateTools.readState(target), before);
  assert.strictEqual(stateTools.provenance(stateTools.snapshot(skill), before.roots[".agents"]["sk-doc"], before.roots[".agents"]["sk-doc"]), "local-modified");
  const legacy = stateTools.snapshot(skill);
  assert.strictEqual(stateTools.provenance(legacy, legacy, null), "untracked-identical");
  fs.writeFileSync(path.join(target, ".sb-kit", "state.json"), "{broken");
  assert.throws(() => install(["sk-explain"], ".agents", target), /metadata/);
  assert.ok(!fs.existsSync(path.join(target, ".agents", "skills", "sk-explain")));
  assert.throws(() => stateTools.skillPath(target, ".agents", "../escape"), /Unsafe/);
  assert.throws(() => stateTools.skillPath(target, ".other", "sk-doc"), /Unsupported/);
});

withDisposableTarget("sb-kit-legacy-fast-", (target) => {
  for (const root of [".agents", ".claude"]) {
    const fast = path.join(target, root, "skills", "sk-excute-fast");
    fs.mkdirSync(fast, { recursive: true });
    fs.writeFileSync(path.join(fast, "SKILL.md"), "existing user-owned fast");
    captureLogs(() => install(["sk-explain"], root, target));
    assert.strictEqual(fs.readFileSync(path.join(fast, "SKILL.md"), "utf8"), "existing user-owned fast");
  }
  assert.ok(!SB_KIT_SKILLS.includes("sk-excute-fast"));
  assert.ok(!fs.existsSync(path.join(__dirname, ".agents", "skills", "sk-excute-fast")));
});

const SKILLS_DIR = path.join(__dirname, ".agents", "skills");
const PACKAGED_SKILLS = listSkills(SKILLS_DIR);
const LOCAL_ONLY_SKILLS = ["herdr", "skill-creator", "sk-create-skill"];
for (const skill of LOCAL_ONLY_SKILLS) assert.ok(!PACKAGED_SKILLS.includes(skill));
const npmIgnore = fs.readFileSync(path.join(SKILLS_DIR, ".npmignore"), "utf8");
for (const skill of LOCAL_ONLY_SKILLS) assert.ok(npmIgnore.includes(`${skill}/`));

function captureLogs(callback) {
  const originalLog = console.log;
  const logs = [];
  console.log = (message) => logs.push(message);
  try {
    callback();
  } finally {
    console.log = originalLog;
  }
  return logs;
}

function parseJson(contents, sourceName) {
  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new Error(`Invalid JSON in ${sourceName}: ${error.message}`);
  }
}

function assertSbKitSkills(target, root) {
  const expectedSkills = [
    "sk-excute",
    ...CORE_ROLE_SKILLS,
    "sk-visualizer",
    "sk-create-slide",
    "sk-release",
    "sk-doc",
    "sk-start-next-hono",
    "sk-explain",
    "sk-verify-code-ui-only",
    "sk-review-diff",
  ];

  assert.deepStrictEqual(SB_KIT_SKILLS, expectedSkills);
  assert.ok(SB_KIT_SKILLS.includes("sk-verify-code-ui-only"));
  assert.ok(SB_KIT_SKILLS.includes("sk-review-diff"));
  for (const skill of expectedSkills) {
    assert.ok(fs.existsSync(path.join(target, root, "skills", skill)), skill);
  }
  const explainSkill = path.join(target, root, "skills", "sk-explain");
  assert.ok(fs.existsSync(path.join(explainSkill, "SKILL.md")));
  assert.ok(fs.existsSync(path.join(explainSkill, "agents", "openai.yaml")));
  assert.ok(!fs.existsSync(path.join(target, root, "skills", "frontend-design")));
  assert.ok(fs.existsSync(path.join(target, root, "skills", "sk-verify-code-ui-only")));
  assert.ok(!fs.existsSync(path.join(target, root, "skills", "sk-create-skill")));
}

function assertVisualizerReferences(target, root) {
  const sourceReferencesDir = path.join(
    __dirname,
    ".agents",
    "skills",
    "sk-visualizer",
    "references",
  );
  const installedReferencesDir = path.join(
    target,
    root,
    "skills",
    "sk-visualizer",
    "references",
  );

  for (const fileName of VISUALIZER_REFERENCE_FILES) {
    const sourceFile = path.join(sourceReferencesDir, fileName);
    const installedFile = path.join(installedReferencesDir, fileName);
    assert.ok(fs.existsSync(installedFile), fileName);
    assert.strictEqual(
      fs.readFileSync(installedFile, "utf8"),
      fs.readFileSync(sourceFile, "utf8"),
      fileName,
    );
  }
}

const NEW_SKILLS_WITH_EVALS = ["sk-debug", "sk-review-diff"];
for (const skill of NEW_SKILLS_WITH_EVALS) {
  const source = path.join(__dirname, ".agents", "skills", skill);
  const instructions = fs.readFileSync(path.join(source, "SKILL.md"), "utf8");
  const metadata = fs.readFileSync(path.join(source, "agents", "openai.yaml"), "utf8");
  const evals = parseJson(fs.readFileSync(path.join(source, "evals", "evals.json"), "utf8"), skill);
  assert.ok(instructions.includes(`name: ${skill}`));
  assert.ok(metadata.includes(`default_prompt: "$${skill}"`));
  assert.strictEqual(evals.skill_name, skill);
  assert.deepStrictEqual(evals.evals.map(({ id }) => id), [1, 2, 3]);
  assert.ok(evals.evals.every((item) => item.prompt && item.expected_output && Array.isArray(item.files) && item.expectations.length));
  assert.strictEqual(SB_KIT_SKILLS.includes(skill), skill === "sk-review-diff");
  withDisposableTarget("sb-kit-new-skill-", (target) => {
    for (const root of [".agents", ".claude"]) {
      captureLogs(() => install([skill], root, target));
      const installed = path.join(target, root, "skills", skill);
      assert.strictEqual(stateTools.snapshot(installed).treeHash, stateTools.snapshot(source).treeHash);
      fs.writeFileSync(path.join(installed, "SKILL.md"), "user-owned sentinel");
      captureLogs(() => install([skill], root, target));
      assert.strictEqual(fs.readFileSync(path.join(installed, "SKILL.md"), "utf8"), "user-owned sentinel");
    }
  });
}

const categorized = categorizedSkills(PACKAGED_SKILLS);
const pickerOptions = categoryOptions(PACKAGED_SKILLS);
assert.deepStrictEqual(Object.keys(categorized), ["sk-work", "assets", "report"]);
assert.deepStrictEqual(categorized.assets, [...ASSET_SKILLS].sort());
assert.ok(!categorized.assets.includes("sk-create-skill"));
assert.deepStrictEqual(categorized.report, [...REPORT_SKILLS].sort());
assert.ok(!categorized.report.includes("sk-verify-code-ui-only"));
assert.ok(!categorized.report.includes("sk-review-diff"));
assert.ok(!categorized.report.includes("sk-verify-code"));
assert.ok(
  Object.values(pickerOptions)
    .flat()
    .some(({ value }) => value === "sk-verify-code-ui-only"),
);
assert.ok(categorized["sk-work"].includes("sk-verify-code-ui-only"));
assert.ok(categorized["sk-work"].includes("sk-review-diff"));
assert.ok(SB_KIT_SKILLS.includes("sk-verify-code-ui-only"));
assert.ok(SB_KIT_SKILLS.includes("sk-review-diff"));
assert.ok(!fs.existsSync(path.join(__dirname, ".agents", "skills", "sk-verify-code")));
assert.deepStrictEqual(
  Object.values(categorized).flat().sort(),
  PACKAGED_SKILLS,
);
assert.deepStrictEqual(
  Object.values(pickerOptions)
    .flat()
    .map(({ value }) => value)
    .sort(),
  PACKAGED_SKILLS,
);
assert.ok(categorized["sk-work"].includes("deep-research"));
assert.ok(categorized["sk-work"].includes("sk-excute"));
assert.ok(!categorized["sk-work"].includes("sk-create-skill"));
assert.ok(!categorized.report.includes("sk-create-skill"));
assert.ok(!categorized["sk-work"].includes("skill-creator"));
const landingSource = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const landingCards = [...landingSource.matchAll(/<article class="skill-card">([\s\S]*?)<\/article>/g)];
const landingSkillNames = landingCards.map(([, article]) => article.match(/<h3>([^<]+)<\/h3>/)[1]);
assert.deepStrictEqual([...landingSkillNames].sort(), PACKAGED_SKILLS);
const landingCoreNames = landingCards
  .filter(([, article]) => /<span class="tag tag-core">core<\/span>/.test(article))
  .map(([, article]) => article.match(/<h3>([^<]+)<\/h3>/)[1]);
assert.deepStrictEqual(landingCoreNames.sort(), [...SB_KIT_SKILLS].sort());
const coreVerifySkillCards = landingCards
  .filter(([, article]) => /<h3>sk-verify-code-ui-only<\/h3>/.test(article));
assert.strictEqual(coreVerifySkillCards.length, 1);
assert.match(coreVerifySkillCards[0][1], /<span class="tag tag-core">core<\/span>/);
const coreReviewDiffCards = landingCards
  .filter(([, article]) => /<h3>sk-review-diff<\/h3>/.test(article));
assert.strictEqual(coreReviewDiffCards.length, 1);
assert.match(coreReviewDiffCards[0][1], /<span class="tag tag-core">core<\/span>/);
assert.ok(!landingCards.some(([, article]) => /<h3>(?:sk-create-skill|skill-creator)<\/h3>/.test(article)));
const supportingCount = PACKAGED_SKILLS.length - SB_KIT_SKILLS.length;
assert.ok(landingSource.includes(`<h2 class="section-label">SaboKit core / ${SB_KIT_SKILLS.length} skills</h2>`));
assert.ok(landingSource.includes(`<h2 class="section-label">Supporting / ${supportingCount} skills</h2>`));
assert.ok(landingSource.includes(`<span class="badge">${PACKAGED_SKILLS.length} agent skills</span>`));
assert.doesNotMatch(landingSource, /<h3>sk-verify-code<\/h3>/);
const readmeSource = fs.readFileSync(path.join(__dirname, "README.md"), "utf8");
const changelogSource = fs.readFileSync(path.join(__dirname, "CHANGELOG.md"), "utf8");
const packageMetadata = parseJson(
  fs.readFileSync(path.join(__dirname, "package.json"), "utf8"),
  "package.json",
);
const packageLock = parseJson(
  fs.readFileSync(path.join(__dirname, "package-lock.json"), "utf8"),
  "package-lock.json",
);
assert.strictEqual(packageLock.version, packageMetadata.version);
assert.strictEqual(packageLock.packages[""].version, packageMetadata.version);
assert.ok(changelogSource.includes(`## [${packageMetadata.version}] - `));
assert.match(changelogSource, /Promote `sk-review-diff` to core/);
assert.match(readmeSource, /Catalog chính thức có \*\*19 skills\*\*, gồm \*\*13 core\*\* và \*\*6 supporting\*\*/);
assert.deepStrictEqual(
  [...readmeSource.matchAll(/^\| `([^`]+)` \|/gm)].map(([, name]) => name).sort(),
  PACKAGED_SKILLS,
);
assert.match(readmeSource, /`sk-create-skill`/);
assert.match(readmeSource, /`sk-create-skill` và `skill-creator` chỉ được giữ trong checkout.*không thuộc catalog, picker hay npm package/i);
assert.match(changelogSource, /Add `sk-create-skill`/);
assert.match(changelogSource, /Keep `sk-create-skill` and `skill-creator` repository-local/);
assert.ok(categorizedSkills(["future-skill"])["sk-work"].includes("future-skill"));

const createSkillSourceDir = path.join(__dirname, ".agents", "skills", "sk-create-skill");
const createSkillFiles = [
  "SKILL.md",
  path.join("agents", "openai.yaml"),
  path.join("evals", "evals.json"),
];
const createSkillSourceBytes = new Map(
  createSkillFiles.map((fileName) => [fileName, fs.readFileSync(path.join(createSkillSourceDir, fileName))]),
);
const createSkillSource = createSkillSourceBytes.get("SKILL.md").toString("utf8");
const createSkillMetadata = createSkillSourceBytes.get(path.join("agents", "openai.yaml")).toString("utf8");
const createSkillEvals = parseJson(
  createSkillSourceBytes.get(path.join("evals", "evals.json")),
  "sk-create-skill/evals/evals.json",
);
assert.match(createSkillSource, /^name: sk-create-skill$/m);
assert.match(createSkillSource, /^description:.*English or Vietnamese.*tạo skill.*$/m);
assert.match(createSkillSource, /\.\.\/sk-excute\/SKILL\.md/);
assert.match(createSkillSource, /\.\.\/skill-creator\/SKILL\.md/);
assert.ok(fs.existsSync(path.resolve(createSkillSourceDir, "..", "sk-excute", "SKILL.md")));
assert.ok(fs.existsSync(path.resolve(createSkillSourceDir, "..", "skill-creator", "SKILL.md")));
assert.match(createSkillMetadata, /display_name: "SK Create Skill"/);
assert.ok(createSkillMetadata.includes('default_prompt: "Use $sk-create-skill'));
assert.strictEqual(createSkillEvals.skill_name, "sk-create-skill");
assert.strictEqual(createSkillEvals.evals.length, 3);
assert.deepStrictEqual(createSkillEvals.evals.map(({ id }) => id), [1, 2, 3]);
for (const evaluation of createSkillEvals.evals) {
  assert.strictEqual(typeof evaluation.prompt, "string");
  assert.strictEqual(typeof evaluation.expected_output, "string");
  assert.ok(Array.isArray(evaluation.files));
  assert.ok(Array.isArray(evaluation.expectations));
}
const evalPrompts = createSkillEvals.evals.map(({ prompt }) => prompt).join("\n");
assert.match(evalPrompts, /have not approved/i);
assert.match(evalPrompts, /approved this spec and file-scoped plan/i);
assert.match(evalPrompts, /skill-creator companion is missing/i);
assert.match(evalPrompts, /sk-ui-copy-review/);
const approvedIntegrationPrompt = createSkillEvals.evals[1].prompt;
for (const approvedPath of [
  ".agents/skills/sk-ui-copy-review/SKILL.md",
  ".agents/skills/sk-ui-copy-review/agents/openai.yaml",
  ".agents/skills/sk-ui-copy-review/evals/evals.json",
  "cli.js",
  "README.md",
  "CHANGELOG.md",
  "index.html",
  "test-cli.js",
]) {
  assert.ok(approvedIntegrationPrompt.includes(approvedPath), approvedPath);
}
assert.match(approvedIntegrationPrompt, /exactly these eight repository paths/);
assert.match(approvedIntegrationPrompt, /`approved-packet\.json` is separate, read-only approval context/);
assert.match(approvedIntegrationPrompt, /selected Inline/);
assert.match(approvedIntegrationPrompt, /node test-cli\.js.*node cli\.js --help/);
assert.match(approvedIntegrationPrompt, /Do not start a recursive evaluation/i);

const createSkillSoloTarget = fs.mkdtempSync(path.join(os.tmpdir(), "sb-kit-create-skill-solo-"));
try {
  assert.strictEqual(install(["sk-create-skill"], ".agents", createSkillSoloTarget), true);
  assert.ok(!fs.existsSync(path.join(createSkillSoloTarget, ".claude")));
  const installedSkill = path.join(createSkillSoloTarget, ".agents", "skills", "sk-create-skill");
  for (const fileName of createSkillFiles) {
    assert.deepStrictEqual(
      fs.readFileSync(path.join(installedSkill, fileName)),
      createSkillSourceBytes.get(fileName),
    );
  }
  assert.ok(!fs.existsSync(path.join(createSkillSoloTarget, ".agents", "skills", "sk-excute")));
  assert.ok(!fs.existsSync(path.join(createSkillSoloTarget, ".agents", "skills", "skill-creator")));

  assert.strictEqual(install(["sk-create-skill"], ".claude", createSkillSoloTarget), true);
  for (const fileName of createSkillFiles) {
    assert.deepStrictEqual(
      fs.readFileSync(path.join(createSkillSoloTarget, ".claude", "skills", "sk-create-skill", fileName)),
      createSkillSourceBytes.get(fileName),
    );
  }
  for (const root of [".agents", ".claude"]) {
    assert.ok(!fs.existsSync(path.join(createSkillSoloTarget, root, "skills", "sk-excute")));
    assert.ok(!fs.existsSync(path.join(createSkillSoloTarget, root, "skills", "skill-creator")));
  }

  const explicitSelection = ["sk-create-skill", "sk-excute", "skill-creator"];
  for (const root of [".agents", ".claude"]) {
    assert.strictEqual(install(explicitSelection, root, createSkillSoloTarget), true);
    for (const fileName of createSkillFiles) {
      assert.deepStrictEqual(
        fs.readFileSync(path.join(createSkillSoloTarget, root, "skills", "sk-create-skill", fileName)),
        createSkillSourceBytes.get(fileName),
      );
    }
    for (const companion of ["sk-excute", "skill-creator"]) {
      const sourceCompanion = path.join(__dirname, ".agents", "skills", companion, "SKILL.md");
      const installedCompanion = path.join(createSkillSoloTarget, root, "skills", companion, "SKILL.md");
      assert.deepStrictEqual(fs.readFileSync(installedCompanion), fs.readFileSync(sourceCompanion));
    }
  }

  const sentinels = new Map();
  for (const root of [".agents", ".claude"]) {
    const skillDir = path.join(createSkillSoloTarget, root, "skills", "sk-create-skill");
    const skillFile = path.join(skillDir, "SKILL.md");
    const sentinel = `user-owned ${root} coordinator`;
    fs.writeFileSync(skillFile, sentinel);
    sentinels.set(skillFile, sentinel);
  }
  const skipLogs = captureLogs(() => {
    for (const root of [".agents", ".claude"]) {
      assert.strictEqual(install(["sk-create-skill"], root, createSkillSoloTarget), true);
    }
  });
  assert.match(skipLogs.join("\n"), /Skipped:.*sk-create-skill/);
  for (const [file, sentinel] of sentinels) {
    assert.strictEqual(fs.readFileSync(file, "utf8"), sentinel);
  }
  for (const root of [".agents", ".claude"]) {
    for (const fileName of createSkillFiles.slice(1)) {
      assert.deepStrictEqual(
        fs.readFileSync(path.join(createSkillSoloTarget, root, "skills", "sk-create-skill", fileName)),
        createSkillSourceBytes.get(fileName),
      );
    }
  }
  console.log("sk-create-skill selected installation passed");
} finally {
  fs.rmSync(createSkillSoloTarget, { recursive: true, force: true });
}

function createFakeRunner(calls, { failHono = false } = {}) {
  return (command, args, options) => {
    calls.push({ command, args, cwd: options.cwd });

    if (args.length === 1 && args[0] === "--version") {
      return { status: 0, stdout: "10.15.0\n", stderr: "" };
    }

    if (args.includes("next-app@latest")) {
      const client = path.join(options.cwd, "client");
      fs.mkdirSync(client, { recursive: true });
      fs.writeFileSync(
        path.join(client, "package.json"),
        JSON.stringify({ name: "client", scripts: {} }),
      );
      fs.writeFileSync(path.join(client, "package-lock.json"), "{}");
      fs.writeFileSync(path.join(client, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");
      fs.writeFileSync(path.join(client, "pnpm-workspace.yaml"), "packages: []");
    }

    if (args.includes("hono@latest")) {
      if (failHono) return { status: 1, stdout: "", stderr: "hono failed" };
      const server = path.join(options.cwd, "server");
      fs.mkdirSync(server, { recursive: true });
      fs.writeFileSync(
        path.join(server, "package.json"),
        JSON.stringify({ name: "server", scripts: {} }),
      );
      fs.writeFileSync(path.join(server, "bun.lock"), "");
    }

    return { status: 0, stdout: "", stderr: "" };
  };
}

function runFakeCreate({ claude = false, failHono = false } = {}) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "sb-kit-create-"));
  const calls = [];
  const logs = [];

  try {
    const handoff = createNextHonoProject(
      { projectPath: "my-app", claude },
      {
        cwd: parent,
        run: createFakeRunner(calls, { failHono }),
        log: (message) => logs.push(message),
      },
    );
    return { parent, target: path.join(parent, "my-app"), calls, logs, handoff };
  } catch (error) {
    error.parent = parent;
    error.calls = calls;
    throw error;
  }
}

const noClaude = runInstall();
try {
  assertSbKitSkills(noClaude.target, ".agents");
  assertVisualizerReferences(noClaude.target, ".agents");
  assert.ok(!fs.existsSync(path.join(noClaude.target, ".claude")));
} finally {
  fs.rmSync(noClaude.target, { recursive: true, force: true });
}

const withClaude = runInstall({ claude: true });
try {
  assertSbKitSkills(withClaude.target, ".agents");
  assertVisualizerReferences(withClaude.target, ".agents");
  assertSbKitSkills(withClaude.target, ".claude");
  assertVisualizerReferences(withClaude.target, ".claude");
  console.log("sb-kit installation passed");
} finally {
  fs.rmSync(withClaude.target, { recursive: true, force: true });
}

const verifyCodeTarget = fs.mkdtempSync(path.join(os.tmpdir(), "sb-kit-verify-code-ui-only-"));
try {
  const sourceSkill = path.join(__dirname, ".agents", "skills", "sk-verify-code-ui-only");
  const sourceFiles = ["SKILL.md", path.join("agents", "openai.yaml")];
  const skillSource = fs.readFileSync(path.join(sourceSkill, "SKILL.md"), "utf8");
  const metadataSource = fs.readFileSync(path.join(sourceSkill, "agents", "openai.yaml"), "utf8");
  assert.match(skillSource, /^name: sk-verify-code-ui-only$/m);
  assert.match(metadataSource, /display_name: "SK Verify Code UI Only"/);
  assert.match(metadataSource, /short_description: "Audit UI-only component, typography, and spacing consistency"/);
  assert.match(metadataSource, /default_prompt: "Use \$sk-verify-code-ui-only to audit/);
  assert.strictEqual(install(["sk-verify-code-ui-only"], ".agents", verifyCodeTarget), true);
  assert.ok(!fs.existsSync(path.join(verifyCodeTarget, ".claude")));

  for (const fileName of sourceFiles) {
    assert.deepStrictEqual(
      fs.readFileSync(
        path.join(verifyCodeTarget, ".agents", "skills", "sk-verify-code-ui-only", fileName),
      ),
      fs.readFileSync(path.join(sourceSkill, fileName)),
    );
  }

  assert.strictEqual(install(["sk-verify-code-ui-only"], ".claude", verifyCodeTarget), true);
  for (const root of [".agents", ".claude"]) {
    for (const fileName of sourceFiles) {
      assert.deepStrictEqual(
        fs.readFileSync(
          path.join(verifyCodeTarget, root, "skills", "sk-verify-code-ui-only", fileName),
        ),
        fs.readFileSync(path.join(sourceSkill, fileName)),
      );
    }
  }

  const userSentinels = new Map();
  for (const root of [".agents", ".claude"]) {
    const installedSkill = path.join(verifyCodeTarget, root, "skills", "sk-verify-code-ui-only");
    const skillFile = path.join(installedSkill, "SKILL.md");
    const contents = `user-owned ${root} SKILL.md`;
    fs.writeFileSync(skillFile, contents);
    userSentinels.set(skillFile, contents);
  }

  const skippedLogs = captureLogs(() => {
    assert.strictEqual(install(["sk-verify-code-ui-only"], ".agents", verifyCodeTarget), true);
    assert.strictEqual(install(["sk-verify-code-ui-only"], ".claude", verifyCodeTarget), true);
  });
  assert.match(skippedLogs.join("\n"), /Skipped:.*sk-verify-code-ui-only/);
  for (const [file, contents] of userSentinels) {
    assert.strictEqual(fs.readFileSync(file, "utf8"), contents);
  }
  for (const root of [".agents", ".claude"]) {
    const installedMetadata = path.join(
      verifyCodeTarget,
      root,
      "skills",
      "sk-verify-code-ui-only",
      "agents",
      "openai.yaml",
    );
    assert.deepStrictEqual(
      fs.readFileSync(installedMetadata),
      fs.readFileSync(path.join(sourceSkill, "agents", "openai.yaml")),
    );
  }
  console.log("sk-verify-code-ui-only selected installation passed");
} finally {
  fs.rmSync(verifyCodeTarget, { recursive: true, force: true });
}

assert.deepStrictEqual(parseCreateArgs(["my-app"]), {
  projectPath: "my-app",
  claude: false,
});
assert.deepStrictEqual(parseCreateArgs(["my-app", "--claude"]), {
  projectPath: "my-app",
  claude: true,
});
assert.throws(() => parseCreateArgs([]), /project name/i);
assert.throws(() => parseCreateArgs(["my-app", "--unknown"]), /unknown option/i);
assert.throws(() => parseCreateArgs(["one", "two"]), /unexpected argument/i);

if (process.platform === "win32") {
  const pnpmVersion = runCommand("pnpm.cmd", ["--version"], {
    cwd: __dirname,
    capture: true,
  });
  assert.strictEqual(pnpmVersion.status, 0, pnpmVersion.error?.message);
  assert.match(pnpmVersion.stdout, /^\d+\.\d+\.\d+/);
}

const defaultCreate = runFakeCreate();
try {
  const rootPackage = JSON.parse(
    fs.readFileSync(path.join(defaultCreate.target, "package.json"), "utf8"),
  );
  const clientPackage = JSON.parse(
    fs.readFileSync(path.join(defaultCreate.target, "client", "package.json"), "utf8"),
  );
  const serverPackage = JSON.parse(
    fs.readFileSync(path.join(defaultCreate.target, "server", "package.json"), "utf8"),
  );

  assert.strictEqual(rootPackage.name, "my-app");
  assert.strictEqual(rootPackage.packageManager, "pnpm@10.15.0");
  assert.strictEqual(rootPackage.scripts.format, "prettier --write .");
  assert.strictEqual(clientPackage.name, "my-app-client");
  assert.strictEqual(serverPackage.name, "my-app-server");
  const workspace = fs.readFileSync(
    path.join(defaultCreate.target, "pnpm-workspace.yaml"),
    "utf8",
  );
  assert.ok(workspace.includes("client"));
  assert.ok(workspace.includes("server"));
  assert.ok(workspace.includes("esbuild: true"));
  assert.ok(workspace.includes("unrs-resolver: true"));
  assert.ok(!fs.existsSync(path.join(defaultCreate.target, "client", "package-lock.json")));
  assert.ok(!fs.existsSync(path.join(defaultCreate.target, "client", "pnpm-lock.yaml")));
  assert.ok(!fs.existsSync(path.join(defaultCreate.target, "client", "pnpm-workspace.yaml")));
  assert.ok(!fs.existsSync(path.join(defaultCreate.target, "server", "bun.lock")));
  assertSbKitSkills(defaultCreate.target, ".agents");
  assertVisualizerReferences(defaultCreate.target, ".agents");
  assert.ok(!fs.existsSync(path.join(defaultCreate.target, ".claude")));
  assert.ok(defaultCreate.handoff.includes("$sk-start-next-hono"));
  assert.match(defaultCreate.handoff, /workflow is inline-first/);
  assert.match(defaultCreate.handoff, /main agent owns the\s+spec, detailed plan\/todos/);
  assert.match(defaultCreate.handoff, /approval for the reviewed spec, then the detailed plan/);
  assert.match(defaultCreate.handoff, /Only native scout, researcher, worker, and reviewer roles/);
  assert.match(defaultCreate.handoff, /worker is optional and receives authorized approved\s+tasks/);
  assert.match(defaultCreate.handoff, /Review its changed files after handback/);
  assert.match(defaultCreate.handoff, /ask before fallback or takeover/);
  assert.doesNotMatch(defaultCreate.handoff, /choose Inline or Sub-agent/i);
  assert.ok(defaultCreate.logs.join("\n").includes("$sk-start-next-hono"));

  const installedSkill = path.join(
    defaultCreate.target,
    ".agents",
    "skills",
    "sk-excute-implementer",
    "SKILL.md",
  );
  fs.writeFileSync(installedSkill, "user-owned role skill");
  assert.strictEqual(install(SB_KIT_SKILLS, ".agents", defaultCreate.target), true);
  assert.strictEqual(
    fs.readFileSync(installedSkill, "utf8"),
    "user-owned role skill",
  );

  assert.deepStrictEqual(
    defaultCreate.calls.map(({ args }) => args),
    [
      ["--version"],
      [
        "create",
        "next-app@latest",
        "client",
        "--ts",
        "--tailwind",
        "--eslint",
        "--app",
        "--import-alias",
        "@/*",
        "--use-pnpm",
        "--disable-git",
        "--yes",
      ],
      ["create", "hono@latest", "server", "--template", "nodejs", "--install", "--pm", "pnpm"],
      ["add", "-Dw", "prettier"],
      ["format"],
    ],
  );
} finally {
  fs.rmSync(defaultCreate.parent, { recursive: true, force: true });
}

const claudeCreate = runFakeCreate({ claude: true });
try {
  assertSbKitSkills(claudeCreate.target, ".agents");
  assertVisualizerReferences(claudeCreate.target, ".agents");
  assertSbKitSkills(claudeCreate.target, ".claude");
  assertVisualizerReferences(claudeCreate.target, ".claude");
} finally {
  fs.rmSync(claudeCreate.parent, { recursive: true, force: true });
}

const nonEmptyParent = fs.mkdtempSync(path.join(os.tmpdir(), "sb-kit-non-empty-"));
try {
  const target = path.join(nonEmptyParent, "my-app");
  const userFile = path.join(target, "user.txt");
  const calls = [];
  fs.mkdirSync(target);
  fs.writeFileSync(userFile, "keep");

  assert.throws(
    () =>
      createNextHonoProject(
        { projectPath: "my-app" },
        { cwd: nonEmptyParent, run: createFakeRunner(calls), log: () => {} },
      ),
    /not empty/i,
  );
  assert.strictEqual(fs.readFileSync(userFile, "utf8"), "keep");
  assert.deepStrictEqual(calls, []);
} finally {
  fs.rmSync(nonEmptyParent, { recursive: true, force: true });
}

let failedCreate;
try {
  runFakeCreate({ failHono: true });
  assert.fail("Expected the Hono generator to fail.");
} catch (error) {
  failedCreate = error;
}

try {
  assert.match(failedCreate.message, /Hono/i);
  assert.ok(fs.existsSync(path.join(failedCreate.parent, "my-app", "client", "package.json")));
  assert.ok(!failedCreate.calls.some(({ args }) => args[0] === "add" || args[0] === "format"));
} finally {
  fs.rmSync(failedCreate.parent, { recursive: true, force: true });
}

const replaceTarget = fs.mkdtempSync(path.join(os.tmpdir(), "sb-kit-replace-"));
try {
  assert.strictEqual(
    install(["sk-doc", "sk-visualizer"], ".agents", replaceTarget),
    true,
  );
  const docSkill = path.join(replaceTarget, ".agents", "skills", "sk-doc");
  const visualizerSkill = path.join(
    replaceTarget,
    ".agents",
    "skills",
    "sk-visualizer",
  );
  const docSkillFile = path.join(docSkill, "SKILL.md");
  const visualizerSkillFile = path.join(visualizerSkill, "SKILL.md");
  fs.writeFileSync(docSkillFile, "old selected skill");
  fs.writeFileSync(path.join(docSkill, "stale.txt"), "remove me");
  fs.writeFileSync(visualizerSkillFile, "unselected skill");

  const replaceLogs = captureLogs(() => {
    assert.strictEqual(
      install(["sk-doc"], ".agents", replaceTarget, { replace: true }),
      true,
    );
  });
  assert.match(replaceLogs.join("\n"), /Replaced: sk-doc/);
  assert.strictEqual(
    fs.readFileSync(docSkillFile, "utf8"),
    fs.readFileSync(
      path.join(__dirname, ".agents", "skills", "sk-doc", "SKILL.md"),
      "utf8",
    ),
  );
  assert.ok(!fs.existsSync(path.join(docSkill, "stale.txt")));
  assert.strictEqual(fs.readFileSync(visualizerSkillFile, "utf8"), "unselected skill");

  assert.strictEqual(install(["sk-doc"], ".claude", replaceTarget), true);
  const claudeDocFile = path.join(
    replaceTarget,
    ".claude",
    "skills",
    "sk-doc",
    "SKILL.md",
  );
  fs.writeFileSync(claudeDocFile, "old Claude skill");
  assert.strictEqual(
    install(["sk-doc"], ".claude", replaceTarget, { replace: true }),
    true,
  );
  assert.strictEqual(
    fs.readFileSync(claudeDocFile, "utf8"),
    fs.readFileSync(
      path.join(__dirname, ".agents", "skills", "sk-doc", "SKILL.md"),
      "utf8",
    ),
  );
  assert.ok(
    !fs.existsSync(path.join(replaceTarget, ".claude", "skills", "sk-visualizer")),
  );
} finally {
  fs.rmSync(replaceTarget, { recursive: true, force: true });
}

async function testInstallPrompts() {
  assert.ok(!Object.values(presetSelections()).flat().includes("sk-excute-fast"));
  assert.ok(!Object.values(presetSelections()).flat().includes("sk-handoff"));
  assert.throws(() => resolveCompanions(["sk-create-skill"], PACKAGED_SKILLS), /Skill is not packaged/);
  assert.throws(() => resolveCompanions(["a"], ["a", "b"], [], { a: ["b"], b: ["a"] }), /cycle/);
  assert.throws(() => resolveCompanions(["missing"], PACKAGED_SKILLS), /not packaged/);
  const selectionPrompts = {
    select: async (config) => { assert.strictEqual(config.initialValue, "manual"); return "manual"; },
    confirm: async (config) => { assert.strictEqual(config.initialValue, false); return false; },
    isCancel: (value) => value === Symbol.for("cancel"),
    cancel: () => {},
    log: { warn: () => {} },
  };
  await assert.rejects(
    chooseInstallSelection(PACKAGED_SKILLS, selectionPrompts, async () => ["sk-create-skill"]),
    /Skill is not packaged/,
  );
  const executionRoles = [
    "sk-excute-explorer",
    "sk-excute-researcher",
    "sk-excute-reviewer",
    "sk-excute-implementer",
  ];
  const executionSelection = await chooseInstallSelection(
    PACKAGED_SKILLS,
    { ...selectionPrompts, confirm: async () => { throw new Error("Execution roles must not require confirmation."); } },
    async () => ["sk-excute"],
  );
  assert.deepStrictEqual([...executionSelection].sort(), ["sk-excute", ...executionRoles].sort());
  const partialExecutionSelection = await chooseInstallSelection(
    PACKAGED_SKILLS,
    { ...selectionPrompts, confirm: async () => { throw new Error("Execution roles must not require confirmation."); } },
    async () => ["sk-excute"],
    ["sk-excute-explorer"],
  );
  assert.deepStrictEqual([...partialExecutionSelection].sort(), ["sk-excute", ...executionRoles].sort());
  let initialSelection;
  await chooseInstallSelection(PACKAGED_SKILLS, { ...selectionPrompts, select: async () => "minimal" }, async (_all, _prompts, initial) => { initialSelection = initial; return ["sk-explain"]; });
  assert.ok(initialSelection.includes("sk-excute"));
  assert.ok(initialSelection.includes("sk-excute-reviewer"));
  const cancellations = [];
  let groupConfig;
  const selected = await chooseSkills(PACKAGED_SKILLS, {
    groupMultiselect: async (config) => {
      groupConfig = config;
      return ["sk-doc", "sk-excute"];
    },
    isCancel: () => false,
    cancel: (message) => cancellations.push(message),
  });
  assert.deepStrictEqual(selected, ["sk-doc", "sk-excute"]);
  assert.strictEqual(groupConfig.required, true);
  assert.deepStrictEqual(groupConfig.options, pickerOptions);

  const cancelledSelection = await chooseSkills(PACKAGED_SKILLS, {
    groupMultiselect: async () => Symbol.for("cancel"),
    isCancel: (value) => value === Symbol.for("cancel"),
    cancel: (message) => cancellations.push(message),
  });
  assert.strictEqual(cancelledSelection, null);

  const emptySelection = await chooseSkills(PACKAGED_SKILLS, {
    groupMultiselect: async () => [],
    isCancel: () => false,
    cancel: (message) => cancellations.push(message),
  });
  assert.strictEqual(emptySelection, null);
  assert.deepStrictEqual(cancellations, [
    "Installation cancelled.",
    "Installation cancelled.",
  ]);

  let conflictConfig;
  const installMode = await chooseConflictMode({
    select: async (config) => {
      conflictConfig = config;
      return "install";
    },
    isCancel: () => false,
    cancel: () => assert.fail("install mode must not cancel"),
  });
  assert.strictEqual(installMode, "install");
  assert.strictEqual(conflictConfig.options[0].value, "install");
  assert.strictEqual(conflictConfig.options[1].value, "replace");

  const cancelledModeMessages = [];
  const cancelledMode = await chooseConflictMode({
    select: async () => Symbol.for("cancel"),
    isCancel: (value) => value === Symbol.for("cancel"),
    cancel: (message) => cancelledModeMessages.push(message),
  });
  assert.strictEqual(cancelledMode, null);
  assert.deepStrictEqual(cancelledModeMessages, ["Installation cancelled."]);
}

async function testUpdatePrompts() {
  for (const stage of ["root", "selection", "overwrite", "final"]) {
    const target = fs.mkdtempSync(path.join(os.tmpdir(), "sb-kit-update-cancel-"));
    try {
      const { packageDir, destination } = updateFixture(target);
      fs.writeFileSync(path.join(destination, "local.txt"), "preserve local");
      const before = stateTools.snapshot(target);
      let confirmations = 0;
      const prompts = {
        select: async (config) => {
          assert.strictEqual(config.initialValue, ".agents");
          return stage === "root" ? Symbol.for("cancel") : ".agents";
        },
        groupMultiselect: async (config) => {
          assert.ok(!Object.values(config.options).flat().some(({ value }) => value.includes("sk-excute-fast")));
          return stage === "selection" ? Symbol.for("cancel") : [".agents:sk-doc"];
        },
        confirm: async (config) => {
          assert.strictEqual(config.initialValue, false);
          confirmations++;
          if (stage === "overwrite" && confirmations === 1) return Symbol.for("cancel");
          return stage === "final" && confirmations === 2 ? false : true;
        },
        isCancel: (value) => value === Symbol.for("cancel"),
        cancel: () => {},
      };
      assert.strictEqual(await runUpdate(target, packageDir, prompts, { log: () => {} }), null);
      assert.strictEqual(stateTools.snapshot(target).treeHash, before.treeHash);
    } finally {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }
}

testInstallPrompts()
  .then(testUpdatePrompts)
  .then(() => console.log("sb-kit bootstrap, presets and update prompts passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
