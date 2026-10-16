// world.mjs — load every graph, run every probe once, and index units by "<slug>:<id>".
import { readAnswers } from './answers.mjs';
import { readClaims, chatName } from './claims.mjs';
import { loadGraphs } from './graph.mjs';
import { readIfExists, resolvePath } from './paths.mjs';
import { evalProbe } from './probes.mjs';

export const keyOf = (slug, id) => `${slug}:${id}`;

// "x" means unit x in the same project; "other:x" means unit x in project "other".
export function depKey(slug, ref) {
  return ref.includes(':') ? ref : keyOf(slug, ref);
}

export function missingFacts(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^#{1,6}\s+missing facts\s*$/i.test(l.trim()));
  if (start < 0) return [];
  const items = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6}\s/.test(line.trim())) break;
    const m = line.match(/^\s*[-*]\s+(.*)$/);
    if (m && !/^\(?none\)?\.?$/i.test(m[1].trim())) items.push(m[1].trim());
  }
  return items;
}

function loadUnit(graph, unit, home, claimsByKey) {
  const root = graph.root;
  const key = keyOf(graph.slug, unit.id);
  const done = evalProbe(unit.done_when, root, home);
  const active = unit.active_when ? evalProbe(unit.active_when, root, home) : null;
  const returnsFile = unit.returns ? resolvePath(root, unit.returns) : null;
  return {
    ...unit,
    key,
    slug: graph.slug,
    root,
    done,
    active,
    claim: claimsByKey.get(key) || null,
    writesAbs: unit.writes.map((w) => resolvePath(root, w)),
    factsAbs: unit.facts.map((f) => resolvePath(root, f)),
    returnsFile,
    returnsText: returnsFile ? readIfExists(returnsFile) : null,
  };
}

export function buildWorld(home) {
  const graphs = loadGraphs(home);
  const claimsByKey = new Map(readClaims(home).map((c) => [keyOf(c.slug, c.unit), c]));
  const units = new Map();
  for (const g of graphs) {
    for (const u of g.units) units.set(keyOf(g.slug, u.id), loadUnit(g, u, home, claimsByKey));
  }
  return { home, graphs, units };
}

export const isDone = (u) => !!u && u.done.value === true;

// Running: not done, and either GMSD started it (a claim) or the disk shows work in flight.
export function isRunning(u) {
  if (!u || isDone(u)) return false;
  return !!u.claim || (u.active && u.active.value === true);
}

export function ownerOf(u) {
  if (u.claim) return u.claim.chat || chatName(u.slug, u.id);
  if (isRunning(u)) return 'unknown (started outside GMSD)';
  return '';
}

// A gate unit waits on Jeff once its return exists, or, for a decision with no return file,
// once everything it waits on is done.
export function awaitsJeff(world, u) {
  if (!u.gate || isDone(u) || isRunning(u)) return false;
  if (u.returnsFile) return u.returnsText != null;
  const answered = readAnswers(world.home).some((a) => a.id === `${u.slug}/${u.id}/gate`);
  return !answered && u.waits_on.every((ref) => isDone(world.units.get(depKey(u.slug, ref))));
}
