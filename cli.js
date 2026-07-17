#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const SB_KIT_SKILLS = ["sk-excute", "sk-visualizer", "sk-create-slide", "sk-release", "sk-doc"];
const USAGE = `sb-kit — install agent skills into the current project

  npx sb-kit install    Choose which packaged skills to install
  npx sb-kit --help     Show this help`;

function usage() {
  console.log(USAGE);
}

function cpRecursive(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

function listSkills(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => {
    return fs.statSync(path.join(dir, name)).isDirectory();
  });
}

function selectedSkills(choice, allSkills) {
  switch (choice) {
    case "1":
      return allSkills;
    case "2":
      return allSkills.filter((name) => SB_KIT_SKILLS.includes(name));
    case "3":
      return allSkills.filter((name) => !SB_KIT_SKILLS.includes(name));
    default:
      return null;
  }
}

async function chooseSkills(allSkills, prompts) {
  const choice = await prompts.select({
    message: "Choose skills to install:",
    options: [
      { value: "1", label: "All", hint: "sb-kit + other skills" },
      { value: "2", label: "sb-kit only", hint: "sk-excute, sk-visualizer, sk-create-slide, sk-release, sk-doc" },
      { value: "3", label: "Other skills only" },
    ],
  });

  if (prompts.isCancel(choice)) {
    prompts.cancel("Installation cancelled.");
    return null;
  }

  return selectedSkills(choice, allSkills);
}

function install(skillNames, root) {
  const srcSkillsDir = path.resolve(__dirname, ".agents", "skills");
  const destSkillsDir = path.resolve(process.cwd(), root, "skills");

  for (const name of skillNames) {
    if (!fs.existsSync(path.join(srcSkillsDir, name))) {
      console.error(`Error: .agents/skills/${name} is missing from the package.`);
      return false;
    }
  }

  fs.mkdirSync(destSkillsDir, { recursive: true });
  const added = [];
  const skipped = [];

  for (const name of skillNames) {
    const destSkill = path.join(destSkillsDir, name);
    if (fs.existsSync(destSkill)) {
      skipped.push(name);
      continue;
    }
    cpRecursive(path.join(srcSkillsDir, name), destSkill);
    added.push(name);
  }

  console.log(`\n✓ ${root}/skills processed`);
  if (added.length) console.log(`  Added:   ${added.join(", ")}`);
  if (skipped.length) console.log(`  Skipped: ${skipped.join(", ")} (already present)`);
  return true;
}

async function chooseClaudeInstall(prompts) {
  const choice = await prompts.select({
    message: "Install for Claude Code too?",
    options: [
      { value: false, label: "No" },
      { value: true, label: "Yes" },
    ],
  });

  if (prompts.isCancel(choice)) {
    prompts.cancel("Claude Code installation skipped.");
    return false;
  }

  return choice;
}

async function main() {
  const cmd = process.argv[2];

  switch (cmd) {
    case "install": {
      const prompts = await import("@clack/prompts");
      const srcSkillsDir = path.resolve(__dirname, ".agents", "skills");
      const allSkills = listSkills(srcSkillsDir);
      if (!allSkills.length) {
        console.error("Error: no packaged skills found.");
        process.exitCode = 1;
        return;
      }
      const skillNames = await chooseSkills(allSkills, prompts);
      if (!skillNames) return;
      if (!install(skillNames, ".agents")) {
        process.exitCode = 1;
        return;
      }
      if (await chooseClaudeInstall(prompts) && !install(skillNames, ".claude")) process.exitCode = 1;
      break;
    }
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
        process.exitCode = 1;
      }
  }
}

main();
