#!/usr/bin/env node
// plant.mjs — checker evidence. Copies GMSD's home and the 3 real project roots into a
// throwaway folder, checks the copy matches the real board, then plants each of the 5 bad
// states from GMSD-BRIEF.md item 3 (plus R6) into a fresh copy and reports caught of N.
// The real project folders are only read. Run: node evidence/plant.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkUnit } from '../gmsd/checker.mjs';
import { allStatuses } from '../gmsd/status.mjs';
import { buildWorld } from '../gmsd/world.mjs';

const HOME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = 'idea-engine:01x-second-host';
const SKIP = new Set(['node_modules']);

function copyTree(from, to, { withGit }) {
  fs.cpSync(from, to, {
    recursive: true,
    filter: (src) => !SKIP.has(path.basename(src)) && (withGit || path.basename(src) !== '.git'),
  });
}

// A fresh copy: GMSD's projects/ and state/, plus each project root, with graph roots rewritten.
function makeCopy() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'gmsd-plant-'));
  const home = path.join(base, 'home');
  for (const dir of ['projects', 'state']) {
    if (fs.existsSync(path.join(HOME, dir))) copyTree(path.join(HOME, dir), path.join(home, dir), { withGit: false });
  }
  for (const g of buildWorld(HOME).graphs.filter((x) => x.root)) {
    const copyRoot = path.join(base, 'roots', g.slug).replace(/\\/g, '/');
    copyTree(g.root, copyRoot, { withGit: g.slug === 'idea-engine' });
    const file = path.join(home, 'projects', g.slug, 'graph.md');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(`root: ${g.root}`, `root: ${copyRoot}`));
  }
  return { base, home, root: (slug) => path.join(base, 'roots', slug) };
}

function editGraph(copy, slug, fn) {
  const file = path.join(copy.home, 'projects', slug, 'graph.md');
  fs.writeFileSync(file, fn(fs.readFileSync(file, 'utf8')));
}

// Add a dependency to a unit: extend its waits_on line, or add one after its title.
const addWait = (unitId, dep) => (text) => {
  const start = text.indexOf(`## ${unitId}\n`) >= 0 ? text.indexOf(`## ${unitId}\n`) : text.indexOf(`## ${unitId}\r\n`);
  const end = text.indexOf('\n## ', start + 1) < 0 ? text.length : text.indexOf('\n## ', start + 1);
  let block = text.slice(start, end);
  block = /^waits_on: .*$/m.test(block)
    ? block.replace(/^(waits_on: .*?)\s*$/m, `$1, ${dep}`)
    : block.replace(/^(title: .*)$/m, `$1\nwaits_on: ${dep}`);
  return text.slice(0, start) + block + text.slice(end);
};

// The target must pass the checker before planting. In the copy only, settle open question 10,
// which 01x waits on, so every refusal after a plant is the planted one.
function prepareTarget(copy) {
  const file = path.join(copy.root('idea-engine'), '_shared', 'open-questions.md');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('(stage 01X smoke test, then stage 04) | Jeff + Roelof | open |', '(stage 01X smoke test, then stage 04) | Jeff + Roelof | settled in the throwaway copy |'));
}

const PLANTS = [
  { rule: 'R1', what: '01x also writes app/, which running unit 01-founder-recall writes',
    plant: (c) => editGraph(c, 'idea-engine', (t) => t.replace('writes: stages/01x_second-host/output/', 'writes: stages/01x_second-host/output/, app/')) },
  { rule: 'R2', what: '01x waits on 02-founder-cases, which is not done',
    plant: (c) => editGraph(c, 'idea-engine', addWait('01x-second-host', '02-founder-cases')) },
  { rule: 'R3', what: 'the stamp is removed from the copied _shared/PRD.md',
    plant: (c) => {
      const prd = path.join(c.root('idea-engine'), '_shared', 'PRD.md');
      fs.writeFileSync(prd, fs.readFileSync(prd, 'utf8').replace(/approved by/gi, 'reviewed by').replace(/approved_by/gi, 'reviewed_by'));
    } },
  { rule: 'R4', what: '00 returns a missing fact, and 01x waits on 00',
    plant: (c) => {
      const done = path.join(c.root('idea-engine'), 'stages', '00_contain-define', 'output', 'done.md');
      fs.appendFileSync(done, '\n## Missing facts\n- the second host list\n');
      editGraph(c, 'idea-engine', addWait('01x-second-host', '00-contain-define'));
    } },
  { rule: 'R5', what: '00 waits on 01x and 01x waits on 00',
    plant: (c) => editGraph(c, 'idea-engine', (t) => addWait('01x-second-host', '00-contain-define')(addWait('00-contain-define', '01x-second-host')(t))) },
  { rule: 'R6', what: 'a new fan-in waits on 01x and 01-founder-recall, with no cross-read.md',
    plant: (c) => editGraph(c, 'idea-engine', (t) => `${t.trimEnd()}\n\n## planted-merge\ntitle: Planted fan-in\nwaits_on: 01x-second-host, 01-founder-recall\nwrites: planted/\ndone_when: exists planted/out.md\nstart_reads: CONTEXT.md\nstop_at: planted/out.md written\n`) },
];

function statusMap(home) {
  const out = {};
  for (const list of allStatuses(buildWorld(home)).values()) for (const s of list) out[s.key] = s.status;
  return out;
}

function baseline() {
  const copy = makeCopy();
  try {
    const real = statusMap(HOME);
    const copied = statusMap(copy.home);
    const diffs = Object.keys(real).filter((k) => real[k] !== copied[k]).map((k) => `${k}: real ${real[k]}, copy ${copied[k]}`);
    prepareTarget(copy);
    const targetClean = checkUnit(buildWorld(copy.home), TARGET).length === 0;
    return { units: Object.keys(real).length, diffs, targetClean };
  } finally { fs.rmSync(copy.base, { recursive: true, force: true }); }
}

function runPlant(p) {
  const copy = makeCopy();
  try {
    prepareTarget(copy);
    p.plant(copy);
    const rules = checkUnit(buildWorld(copy.home), TARGET).map((r) => r.rule);
    return { ...p, caught: rules.includes(p.rule), rules };
  } finally { fs.rmSync(copy.base, { recursive: true, force: true }); }
}

const b = baseline();
console.log(`baseline: ${b.units} units compared, copy differs from real on ${b.diffs.length}${b.diffs.length ? `: ${b.diffs.join('; ')}` : ''}`);
console.log(`baseline: ${TARGET} passes the checker before planting: ${b.targetClean}`);
const results = PLANTS.map(runPlant);
for (const r of results) console.log(`${r.caught ? 'CAUGHT' : 'MISSED'} ${r.rule}: ${r.what} -> refusals [${r.rules.join(', ')}]`);
const brief = results.filter((r) => r.rule !== 'R6');
console.log(`caught ${brief.filter((r) => r.caught).length} of ${brief.length} brief rules; R6 ${results.find((r) => r.rule === 'R6').caught ? 'caught' : 'missed'}`);
process.exitCode = b.targetClean && results.every((r) => r.caught) ? 0 : 1;
