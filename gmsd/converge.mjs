// converge.mjs — the chair. For each fan-in unit: cross-read.md (written before the branches run),
// differences.md (| id | difference | branches |) and rulings.md (| id | ruling | by | on |).
// Every difference without a ruling becomes a queue item; answering it appends the ruling row.
import fs from 'node:fs';
import path from 'node:path';
import { convergeDir, isFanIn } from './checker.mjs';
import { readIfExists, toSlash } from './paths.mjs';
import { sha256 } from './stamps.mjs';

export function parseTable(text) {
  if (!text) return [];
  const rows = [];
  let position = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) { position = 0; continue; }
    position += 1;
    if (position <= 2) continue;
    rows.push(line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  }
  return rows.filter((cells) => cells.some(Boolean));
}

function rulingsById(dir) {
  const map = new Map();
  for (const [id, ruling, by] of parseTable(readIfExists(path.join(dir, 'rulings.md')))) {
    if (id && ruling && by) map.set(id, { ruling, by });
  }
  return map;
}

function rulingItem(unit, dir, row) {
  const [id, difference, branches = ''] = row;
  const sides = branches.split(/,|\bvs\b/).map((b) => b.trim()).filter(Boolean).slice(0, 2);
  const answers = sides.map((side, i) => ({
    key: 'ab'[i], label: `Take ${side}'s version`, action: 'append-ruling', ruling: `take ${side}`,
  }));
  answers.push({ key: 'abc'[answers.length], label: 'Name it a gap and assign it to: ___', action: 'append-ruling', ruling: 'gap, assigned to' });
  return {
    id: `${unit.slug}/${unit.id}/ruling/${id}`,
    project: unit.slug,
    unit: unit.key,
    gate: 'ruling',
    question: `At fan-in ${unit.id}, difference ${id}: ${difference}. Which way?`,
    open: toSlash(path.join(dir, 'differences.md')),
    fingerprint: sha256(row.join('|')).slice(0, 10),
    answers,
    blocks: [unit.key],
    differenceId: id,
    rulingsFile: path.join(dir, 'rulings.md'),
  };
}

export function rulingItems(world) {
  const out = [];
  for (const unit of world.units.values()) {
    if (!isFanIn(world, unit)) continue;
    const dir = convergeDir(world, unit);
    const ruled = rulingsById(dir);
    for (const row of parseTable(readIfExists(path.join(dir, 'differences.md')))) {
      if (row[0] && !ruled.has(row[0])) out.push(rulingItem(unit, dir, row));
    }
  }
  return out;
}

export function appendRuling(file, differenceId, ruling, by) {
  const on = new Date().toISOString().slice(0, 10);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '# Rulings\n\n| id | ruling | by | on |\n|---|---|---|---|\n', 'utf8');
  }
  const safe = (t) => String(t).replace(/\|/g, '/').replace(/\r?\n/g, ' ');
  fs.appendFileSync(file, `| ${safe(differenceId)} | ${safe(ruling)} | ${safe(by)} | ${on} |\n`, 'utf8');
}
