const fs = require("fs");
const stateTools = require("./skill-state");
const { REQUIRED_COMPANIONS, CONDITIONAL_COMPANIONS } = require("./catalog");

function inspectProject(projectDir, packageDir, { io = fs } = {}) {
  const findings = [];
  const skills = [];
  const byRoot = { ".agents": new Map(), ".claude": new Map() };
  let state = null;
  function finding(code, severity, root, skill, status, message) {
    findings.push({ code, severity, root, skill, status, message });
  }
  try {
    state = stateTools.readState(projectDir, io);
  } catch (error) {
    finding("receipt-invalid", "error", null, null, "error", error.message);
  }
  try {
    stateTools.assertNoPendingOperation(projectDir, io);
  } catch (error) {
    finding("mutation-pending", "error", null, null, "error", error.message);
  }
  let packaged = [];
  try {
    const sourceRoot = stateTools.managedPath(packageDir, ".agents", "skills");
    if (!stateTools.statSafe(sourceRoot, io)?.isDirectory()) throw new Error("Packaged skill source is missing.");
    packaged = stateTools.inventory(packageDir, ".agents", io);
  } catch (error) {
    finding("package-unreadable", "error", null, null, "error", error.message);
  }
  const known = new Set(packaged);
  for (const root of stateTools.ROOTS) {
    let installed;
    try {
      installed = stateTools.inventory(projectDir, root, io);
    } catch (error) {
      finding("root-unreadable", "error", root, null, "error", error.message);
      continue;
    }
    for (const name of installed) {
      try {
        const localDir = stateTools.skillPath(projectDir, root, name);
        const local = stateTools.snapshot(localDir, io);
        const usable = local.files.some((file) => file.path === "SKILL.md");
        byRoot[root].set(name, { local, usable });
        if (!usable) finding("skill-incomplete", "warning", root, name, "incomplete", "SKILL.md is missing.");
        if (!known.has(name)) {
          skills.push({ root, skill: name, status: "unmanaged", packageVersionAtInstall: null });
          finding("skill-unmanaged", "information", root, name, "unmanaged", "Not packaged by this sb-kit; left untouched.");
          continue;
        }
        const upstream = stateTools.snapshot(stateTools.skillPath(packageDir, ".agents", name), io);
        if (!upstream.files.some((file) => file.path === "SKILL.md")) {
          throw new Error("Packaged skill source is incomplete.");
        }
        const baseline = state?.roots[root][name] || null;
        const status = stateTools.provenance(local, upstream, baseline);
        const attention = !["unchanged", "untracked-identical"].includes(status);
        skills.push({ root, skill: name, status, packageVersionAtInstall: baseline?.packageVersion || null });
        finding("skill-provenance", attention ? "warning" : "information", root, name, status,
          status === "unknown" ? "Differs from this package; no trusted install baseline, origin unknown." :
            status === "untracked-identical" ? "Matches this package, but has no install receipt." :
              `${status}; receipt versions describe the package, not individual skill SemVer.`);
      } catch (error) {
        finding("skill-unreadable", "error", root, name, "error", error.message);
      }
    }
    const available = byRoot[root];
    for (const [name, value] of available) {
      if (!known.has(name) || !value.usable) continue;
      for (const companion of REQUIRED_COMPANIONS[name] || []) {
        if (!available.get(companion)?.usable) {
          finding("companion-missing", "warning", root, name, "missing", `Required companion ${companion} is missing in ${root}.`);
        }
      }
      for (const companion of CONDITIONAL_COMPANIONS[name] || []) {
        if (!available.get(companion)?.usable) {
          finding("reviewer-conditional", "warning", root, name, "conditional", `${companion} is missing; independent review needs host support, or explicit user consent for self-review fallback.`);
        }
      }
    }
    for (const name of Object.keys(state?.roots[root] || {})) {
      if (!installed.includes(name)) {
        finding("receipt-target-missing", "warning", root, name, "missing", "A receipt exists but the installed skill is absent; no repair performed.");
      }
    }
  }
  for (const [name, left] of byRoot[".agents"]) {
    const right = byRoot[".claude"].get(name);
    if (right && left.local.treeHash !== right.local.treeHash) {
      finding("mirror-different", "warning", null, name, "different", "The installed .agents and .claude copies differ.");
    }
  }
  if (!skills.length && !findings.length) {
    finding("project-empty", "information", null, null, "empty", "No installed skills. The optional Claude root is not required.");
  }
  const exitCode = findings.some((item) => item.severity === "error") ? 2 :
    findings.some((item) => item.severity === "warning") ? 1 : 0;
  return { schemaVersion: 1, exitCode, skills, findings };
}

function renderDoctor(report) {
  return [
    `sb-kit doctor — ${report.exitCode === 2 ? "error" : report.exitCode === 1 ? "attention needed" : "clean / informational"}`,
    ...report.findings.map((item) => `[${item.severity}] ${[item.root, item.skill].filter(Boolean).join("/") || "project"}: ${item.message}`),
    "Read-only inspection; nothing was repaired or written.",
  ].join("\n");
}

module.exports = { inspectProject, renderDoctor };
