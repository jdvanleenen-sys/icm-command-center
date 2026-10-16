// checker.mjs — refuses a start that would break the graph. Every rule is exact, so it is code.
// R1 write overlap · R2 waits on unfinished · R3 unstamped fact · R4 missing facts returned ·
// R5 dependency loop · R6 fan-in without a cross-read list.
import fs from 'node:fs';
import path from 'node:path';
import { pathsOverlap } from './paths.mjs';
import { factApproval } from './stamps.mjs';
import { depKey, isDone, isRunning, missingFacts } from './world.mjs';

const refuse = (rule, message) => ({ rule, message });

export function depsOf(world, unit) {
  return unit.waits_on.map((ref) => depKey(unit.slug, ref));
}

// Every unit key that sits on a cycle of waits_on edges.
export function unitsInCycles(world) {
  const onCycle = new Set();
  const state = new Map();
  const stack = [];
  const visit = (key) => {
    state.set(key, 'open');
    stack.push(key);
    const unit = world.units.get(key);
    for (const dep of unit ? depsOf(world, unit) : []) {
      if (!world.units.has(dep)) continue;
      if (state.get(dep) === 'open') stack.slice(stack.indexOf(dep)).forEach((k) => onCycle.add(k));
      else if (!state.has(dep)) visit(dep);
    }
    stack.pop();
    state.set(key, 'closed');
  };
  for (const key of world.units.keys()) if (!state.has(key)) visit(key);
  return onCycle;
}

function reaches(world, from, to, seen = new Set()) {
  if (from === to) return true;
  if (seen.has(from)) return false;
  seen.add(from);
  const unit = world.units.get(from);
  return !!unit && depsOf(world, unit).some((d) => reaches(world, d, to, seen));
}

// A fan-in is a unit with 2 or more waits_on that do not depend on each other (they can run side by side).
export function isFanIn(world, unit) {
  const deps = depsOf(world, unit).filter((d) => world.units.has(d));
  for (let i = 0; i < deps.length; i += 1) {
    for (let j = i + 1; j < deps.length; j += 1) {
      if (!reaches(world, deps[i], deps[j]) && !reaches(world, deps[j], deps[i])) return true;
    }
  }
  return false;
}

export function convergeDir(world, unit) {
  return path.join(world.home, 'projects', unit.slug, 'converge', unit.id);
}

function ruleR6(world, unit) {
  const fanIns = [...world.units.values()].filter((f) =>
    isFanIn(world, f) && (f.key === unit.key || depsOf(world, f).includes(unit.key)));
  return fanIns
    .filter((f) => !fs.existsSync(path.join(convergeDir(world, f), 'cross-read.md')))
    .map((f) => refuse('R6', `fan-in ${f.key} has no cross-read.md; write it before its branches run`));
}

function ruleR1(world, unit) {
  const out = [];
  for (const other of world.units.values()) {
    if (other.key === unit.key || !isRunning(other)) continue;
    for (const mine of unit.writesAbs) {
      const clash = other.writesAbs.find((theirs) => pathsOverlap(mine, theirs));
      if (clash) { out.push(refuse('R1', `writes ${mine}, which running unit ${other.key} also writes (${clash})`)); break; }
    }
  }
  return out;
}

function rulesOnDeps(world, unit) {
  const out = [];
  for (const dep of depsOf(world, unit)) {
    const up = world.units.get(dep);
    if (!up) { out.push(refuse('R2', `waits on ${dep}, which no graph declares`)); continue; }
    if (!isDone(up)) out.push(refuse('R2', `waits on ${dep}, which is not done (${up.done.reason})`));
    const missing = missingFacts(up.returnsText);
    if (missing.length) out.push(refuse('R4', `${dep} returned missing facts: ${missing.join('; ')}`));
  }
  return out;
}

function ruleR3(world, unit) {
  return unit.factsAbs
    .map((file) => factApproval(world.home, file))
    .filter((a) => !a.ok)
    .map((a) => refuse('R3', a.reason));
}

// All refusals for starting one unit; an empty list means it may start.
export function checkUnit(world, key, cycles = unitsInCycles(world)) {
  const unit = world.units.get(key);
  if (!unit) return [refuse('R0', `no unit ${key} in any graph`)];
  const out = [];
  if (cycles.has(key)) out.push(refuse('R5', `${key} is on a dependency loop`));
  out.push(...rulesOnDeps(world, unit), ...ruleR3(world, unit), ...ruleR1(world, unit), ...ruleR6(world, unit));
  return out;
}
