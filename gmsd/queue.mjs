// queue.mjs — the "waiting on Jeff" items, generated from the graph and the disk. Each item is
// one question with 1 to 3 answers, and every answer maps to one action in answers.mjs.
import path from 'node:path';
import { depsOf } from './checker.mjs';
import { rulingItems } from './converge.mjs';
import { readIfExists, resolvePath, toSlash } from './paths.mjs';
import { factApproval, sha256 } from './stamps.mjs';
import { findAnswer } from './answers.mjs';
import { awaitsJeff, missingFacts, isDone } from './world.mjs';

export const short = (text) => sha256(text).slice(0, 10);

const graphFile = (world, u) => toSlash(path.join(world.home, 'projects', u.slug, 'graph.md'));

function item(fields) {
  return { blocks: [], ...fields };
}

function factItems(world) {
  const seen = new Map();
  for (const u of world.units.values()) {
    if (isDone(u)) continue;
    for (const file of u.factsAbs) {
      if (factApproval(world.home, file).ok) continue;
      const entry = seen.get(file) || { file, slug: u.slug, blocks: [] };
      entry.blocks.push(u.key);
      seen.set(file, entry);
    }
  }
  return [...seen.values()].map((e) => item({
    id: `${e.slug}/fact/${short(e.file.toLowerCase())}`,
    project: e.slug,
    gate: 'fact approval',
    question: `Approve ${path.basename(e.file)} as the shared fact file, as it reads now?`,
    open: e.file,
    fingerprint: short(readIfExists(e.file) ?? 'missing'),
    answers: [
      { key: 'a', label: 'Yes, approve it as it is now', action: 'approve-fact', target: e.file },
      { key: 'b', label: 'No, change it first: ___', action: 'note' },
    ],
    blocks: e.blocks,
  }));
}

function blocksOf(world, unit) {
  return [...world.units.values()].filter((o) => depsOf(world, o).includes(unit.key)).map((o) => o.key);
}

function gateItem(world, u) {
  if (!awaitsJeff(world, u)) return null;
  const isDecision = !u.returnsFile;
  const answers = isDecision
    ? [{ key: 'a', label: 'My decision: ___', action: 'note' }]
    : [
      { key: 'a', label: 'Yes, approve it', action: 'approve-return', target: u.returnsFile, signNeeded: !/^\s*approved\s/.test(u.done_when) },
      { key: 'b', label: 'No, rework: ___', action: 'note' },
    ];
  return item({
    id: `${u.slug}/${u.id}/gate`,
    project: u.slug,
    unit: u.key,
    gate: 'unit gate',
    question: isDecision ? `${u.title.replace(/[.?]$/, '')}?` : `Approve ${u.id}'s return, ${path.basename(u.returnsFile)}? (${u.gate})`,
    open: u.returnsFile || (u.reads.length ? resolvePath(u.root, u.reads[0]) : graphFile(world, u)),
    fingerprint: short(u.returnsText ?? 'decision'),
    answers,
    blocks: blocksOf(world, u),
  });
}

function missingItem(u) {
  const missing = missingFacts(u.returnsText);
  if (!missing.length) return null;
  return item({
    id: `${u.slug}/${u.id}/missing`,
    project: u.slug,
    unit: u.key,
    gate: 'missing facts',
    question: `${u.id} says it was missing: ${missing.join('; ')}. Supply them, or send them upstream?`,
    open: u.returnsFile,
    fingerprint: short(u.returnsText),
    answers: [
      { key: 'a', label: 'Here are the facts: ___', action: 'note' },
      { key: 'b', label: 'They belong in a shared fact file; fix it there and rerun', action: 'note' },
    ],
  });
}

function gapItem(world, u) {
  return item({
    id: `${u.slug}/${u.id}/gap`,
    project: u.slug,
    unit: u.key,
    gate: 'gap',
    question: `GMSD cannot read ${u.id}'s state from disk (${u.done.reason}). What file shows it is done?`,
    open: graphFile(world, u),
    fingerprint: short(u.done.reason),
    answers: [
      { key: 'a', label: 'It is done when this exists: ___', action: 'note' },
      { key: 'b', label: 'Drop this unit from the graph', action: 'note' },
    ],
  });
}

function unitItems(world) {
  const out = [];
  for (const u of world.units.values()) {
    if (isDone(u)) continue;
    const gate = u.gate ? gateItem(world, u) : null;
    if (gate) out.push(gate);
    const missing = missingItem(u);
    if (missing) out.push(missing);
    if (u.done.value === null && !gate) out.push(gapItem(world, u));
  }
  return out;
}

// { open, answered }: answered items wait for the follow-up they triggered.
export function buildQueue(world) {
  const all = [...factItems(world), ...unitItems(world), ...rulingItems(world)];
  const open = [];
  const answered = [];
  for (const it of all) {
    const ans = findAnswer(world.home, it.id, it.fingerprint);
    if (ans) answered.push({ ...it, answer: ans }); else open.push(it);
  }
  return { open, answered };
}
