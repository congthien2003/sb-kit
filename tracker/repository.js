const fs = require("node:fs");
const path = require("node:path");

function walkUp(start, predicate) {
  let current = path.resolve(start);
  while (true) {
    if (predicate(current)) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function findGitRoot(start = process.cwd()) {
  const root = walkUp(start, (dir) => fs.existsSync(path.join(dir, ".git")));
  if (!root) throw new Error("Run this command inside a Git repository.");
  return root;
}

function findTrackerRoot(start = process.cwd()) {
  const root = walkUp(start, (dir) =>
    fs.existsSync(path.join(dir, ".sb-kit", "tracker.sqlite")),
  );
  if (!root)
    throw new Error("Tracker is not initialized. Run `sb-kit track init`.");
  return root;
}

function initializeRepository(start = process.cwd()) {
  const root = findGitRoot(start);
  fs.mkdirSync(path.join(root, ".sb-kit"), { recursive: true });
  const ignorePath = path.join(root, ".gitignore");
  const current = fs.existsSync(ignorePath)
    ? fs.readFileSync(ignorePath, "utf8")
    : "";
  if (!current.split(/\r?\n/).includes(".sb-kit/")) {
    fs.appendFileSync(
      ignorePath,
      `${current && !current.endsWith("\n") ? "\n" : ""}.sb-kit/\n`,
    );
  }
  return root;
}

function resolveArtifactPath(root, relativePath) {
  if (!relativePath || path.isAbsolute(relativePath))
    throw new Error("Artifact path must be relative to the repository.");
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  if (!resolved.startsWith(`${resolvedRoot}${path.sep}`))
    throw new Error("Artifact path must stay inside the repository.");
  if (!fs.statSync(resolved, { throwIfNoEntry: false })?.isFile())
    throw new Error(`Artifact file does not exist: ${relativePath}`);
  return resolved;
}

module.exports = {
  findGitRoot,
  findTrackerRoot,
  initializeRepository,
  resolveArtifactPath,
};
