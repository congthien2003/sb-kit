const { REQUIRED_COMPANIONS, AUTO_INCLUDED_COMPANIONS } = require("./catalog");
const { assertName } = require("./skill-state");

function resolveCompanions(selected, packaged, available = [], registry = REQUIRED_COMPANIONS) {
  const known = new Set(packaged);
  const present = new Set([...selected, ...available]);
  const missing = new Set();
  const visiting = new Set();
  const visited = new Set();
  function visit(name) {
    assertName(name);
    if (!known.has(name)) throw new Error(`Skill is not packaged: ${name}`);
    if (visiting.has(name)) throw new Error(`Companion dependency cycle: ${name}`);
    if (visited.has(name)) return;
    visiting.add(name);
    const dependencies = registry[name] || [];
    if (!Array.isArray(dependencies)) throw new Error("Invalid companion registry.");
    for (const dependency of dependencies) {
      visit(dependency);
      if (!present.has(dependency)) missing.add(dependency);
    }
    visiting.delete(name);
    visited.add(name);
  }
  for (const name of selected) visit(name);
  return [...missing].sort();
}

async function chooseInstallSelection(packaged, prompts, picker, available = []) {
  const selected = await picker(packaged, prompts);
  if (!selected) return null;
  let result = [...new Set(selected)];
  result = [...new Set([
    ...result,
    ...resolveCompanions(result, packaged, [], AUTO_INCLUDED_COMPANIONS),
  ])];
  const missing = resolveCompanions(result, packaged, available);
  if (missing.length) {
    const add = await prompts.confirm({
      message: `Add required companions to the selection: ${missing.join(", ")}?`,
      initialValue: false,
    });
    if (prompts.isCancel(add)) {
      prompts.cancel("Installation cancelled.");
      return null;
    }
    if (add === true) result = [...new Set([...result, ...missing])];
    else prompts.log?.warn(`Companions not selected: ${missing.join(", ")}. Dependent skills may be unavailable.`);
  }
  return [...new Set([
    ...result,
    ...resolveCompanions(result, packaged, [], AUTO_INCLUDED_COMPANIONS),
  ])];
}

module.exports = { resolveCompanions, chooseInstallSelection };
