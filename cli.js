#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const USAGE = `sb-kit — pull .agents skills into any project

  npx sb-kit install    Pull .agents folder into current directory
  npx sb-kit --help     Show this help`;

function usage() {
  console.log(USAGE);
}

function cpRecursive(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

function install() {
  const srcDir = path.resolve(__dirname, ".agents");
  const destDir = path.resolve(process.cwd(), ".agents");

  if (!fs.existsSync(srcDir)) {
    console.error("Error: .agents folder not found in sb-kit package.");
    process.exit(1);
  }

  // Fresh install — copy entire .agents folder
  if (!fs.existsSync(destDir)) {
    cpRecursive(srcDir, destDir);
    const skills = listSkills(destDir);
    console.log(`✓ .agents installed to ${destDir}`);
    console.log(`  Skills: ${skills.join(", ")}`);
    return;
  }

  // Merge — .agents exists, sync skills individually
  const srcSkillsDir = path.join(srcDir, ".skills");
  const destSkillsDir = path.join(destDir, ".skills");

  if (!fs.existsSync(srcSkillsDir)) {
    console.log("✓ .agents already exists (no skills to merge from package).");
    return;
  }

  fs.mkdirSync(destSkillsDir, { recursive: true });

  const added = [];
  const skipped = [];

  for (const name of fs.readdirSync(srcSkillsDir)) {
    const srcSkill = path.join(srcSkillsDir, name);
    const destSkill = path.join(destSkillsDir, name);

    if (!fs.statSync(srcSkill).isDirectory()) continue;

    if (fs.existsSync(destSkill)) {
      skipped.push(name);
      continue;
    }

    cpRecursive(srcSkill, destSkill);
    added.push(name);
  }

  console.log(`✓ .agents already exists — merged skills`);
  if (added.length)   console.log(`  Added:   ${added.join(", ")}`);
  if (skipped.length) console.log(`  Skipped: ${skipped.join(", ")} (already present)`);
}

function listSkills(dir) {
  const skillsDir = path.join(dir, ".skills");
  if (!fs.existsSync(skillsDir)) return [];
  return fs.readdirSync(skillsDir).filter((n) => {
    return fs.statSync(path.join(skillsDir, n)).isDirectory();
  });
}

// --- entry ---
const cmd = process.argv[2];

switch (cmd) {
  case "install":
    install();
    break;
  case "--help":
  case "-h":
    usage();
    break;
  default:
    if (cmd === undefined) {
      usage();
    } else {
      console.error(`Unknown command: ${cmd}`);
      usage();
      process.exit(1);
    }
}
