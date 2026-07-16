#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const SB_KIT_SKILLS = ["sk-excute", "sk-visualizer"];
const SKILL_ROOTS = [".agents", ".claude"];
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

function chooseSkills(allSkills) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    const ask = () => {
      console.log("\nChoose skills to install:");
      console.log("  1. All (sb-kit + other skills)");
      console.log("  2. sb-kit only (sk-excute, sk-visualizer)");
      console.log("  3. Other skills only");
      rl.question("\nSelect 1-3: ", (answer) => {
        const skills = selectedSkills(answer.trim(), allSkills);
        if (!skills) {
          console.log("Please select 1, 2, or 3.");
          ask();
          return;
        }
        rl.close();
        resolve(skills);
      });
    };

    ask();
  });
}

function install(skillNames) {
  const sources = SKILL_ROOTS.map((root) => ({
    root,
    srcSkillsDir: path.resolve(__dirname, root, "skills"),
    destSkillsDir: path.resolve(process.cwd(), root, "skills"),
  }));

  for (const { root, srcSkillsDir } of sources) {
    for (const name of skillNames) {
      if (!fs.existsSync(path.join(srcSkillsDir, name))) {
        console.error(`Error: ${root}/skills/${name} is missing from the package.`);
        return false;
      }
    }
  }

  for (const { root, srcSkillsDir, destSkillsDir } of sources) {
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
  }

  return true;
}

async function main() {
  const cmd = process.argv[2];

  switch (cmd) {
    case "install": {
      const srcSkillsDir = path.resolve(__dirname, ".agents", "skills");
      const allSkills = listSkills(srcSkillsDir);
      if (!allSkills.length) {
        console.error("Error: no packaged skills found.");
        process.exitCode = 1;
        return;
      }
      if (!install(await chooseSkills(allSkills))) process.exitCode = 1;
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
