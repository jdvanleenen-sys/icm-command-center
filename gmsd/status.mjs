// status.mjs — each unit's status, worked out from the world. Order: done, running, unknown,
// then ready or blocked by the checker. Nothing here is typed by a person.
import { checkUnit, unitsInCycles } from './checker.mjs';
import { awaitsJeff, isDone, isRunning, ownerOf } from './world.mjs';

export function unitStatus(world, unit, cycles) {
  const base = { key: unit.key, id: unit.id, title: unit.title, owner: ownerOf(unit), refusals: [] };
  if (isDone(unit)) return { ...base, status: 'done', reason: unit.done.reason };
  if (isRunning(unit)) {
    const why = unit.claim ? `started ${unit.claim.started}` : unit.active.reason;
    return { ...base, status: 'running', reason: why };
  }
  if (awaitsJeff(world, unit)) return { ...base, status: 'waiting on Jeff', reason: unit.gate };
  if (unit.done.value === null) return { ...base, status: 'unknown', reason: unit.done.reason };
  const refusals = checkUnit(world, unit.key, cycles);
  if (!refusals.length) return { ...base, status: 'ready', reason: 'every check passes' };
  return { ...base, status: 'blocked', reason: refusals.map((r) => `${r.rule}: ${r.message}`).join(' | '), refusals };
}

// Statuses for every unit, grouped by project, in graph order.
export function allStatuses(world) {
  const cycles = unitsInCycles(world);
  const byProject = new Map(world.graphs.map((g) => [g.slug, []]));
  for (const unit of world.units.values()) byProject.get(unit.slug).push(unitStatus(world, unit, cycles));
  return byProject;
}

// The first ready unit in graph order; if none, say what stops the project.
export function nextUp(statuses) {
  const ready = statuses.find((s) => s.status === 'ready');
  if (ready) return { unit: ready.id, key: ready.key };
  if (!statuses.length) return { none: 'no units in this graph' };
  if (statuses.every((s) => s.status === 'done')) return { none: 'every unit is done' };
  const ids = (status) => statuses.filter((s) => s.status === status).map((s) => s.id);
  const parts = [];
  if (ids('running').length) parts.push(`running: ${ids('running').join(', ')}`);
  if (ids('waiting on Jeff').length) parts.push(`waiting on Jeff: ${ids('waiting on Jeff').join(', ')}`);
  const stuck = statuses.find((s) => s.status === 'blocked');
  if (stuck) parts.push(`first blocked: ${stuck.id} (${stuck.refusals.map((r) => r.rule).join(', ')})`);
  if (ids('unknown').length) parts.push(`unknown: ${ids('unknown').join(', ')}`);
  return { none: parts.join('; ') };
}
