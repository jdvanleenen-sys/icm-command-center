// graph.mjs — read projects/<slug>/graph.md into units. Structure only; no status lives here.
import fs from 'node:fs';
import path from 'node:path';
import { stripTicks } from './paths.mjs';

const LIST_FIELDS = ['waits_on', 'reads', 'writes', 'facts', 'start_reads', 'links'];
const REQUIRED = ['title', 'writes', 'done_when', 'start_reads', 'stop_at'];

export function splitList(value) {
  if (!value || /^\[\s*\]$/.test(value.trim())) return [];
  return value.replace(/^\[|\]$/g, '').split(',').map(stripTicks).filter(Boolean);
}

function parseKeyLines(lines) {
  const out = {};
  for (const line of lines) {
    const kv = line.match(/^([a-z][\w]*):\s*(.*?)\s*(?:\s#\s.*)?$/);
    if (!kv) continue;
    out[kv[1]] = LIST_FIELDS.includes(kv[1]) ? splitList(kv[2]) : kv[2];
  }
  return out;
}

function splitFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { head: {}, body: text };
  return { head: parseKeyLines(m[1].split(/\r?\n/)), body: text.slice(m[0].length) };
}

function parseUnits(body) {
  const units = [];
  let current = null;
  for (const line of body.split(/\r?\n/)) {
    const h = line.match(/^##\s+(\S+)\s*$/);
    if (h) {
      current = { id: h[1], lines: [] };
      units.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return units.map((u, index) => ({ id: u.id, index, ...defaults(), ...parseKeyLines(u.lines) }));
}

function defaults() {
  return { waits_on: [], reads: [], writes: [], facts: [], start_reads: [], returns: '', gate: '', active_when: '' };
}

function validate(graph) {
  const problems = [];
  if (!graph.project) problems.push('frontmatter has no project:');
  if (!graph.root && graph.units.length) problems.push('frontmatter has no root:');
  const seen = new Set();
  for (const u of graph.units) {
    if (seen.has(u.id)) problems.push(`unit ${u.id} is declared twice`);
    seen.add(u.id);
    for (const f of REQUIRED) {
      const v = u[f];
      if (v == null || (Array.isArray(v) ? !v.length : !String(v).trim())) problems.push(`unit ${u.id} has no ${f}:`);
    }
  }
  return problems;
}

export function parseGraph(text, slug) {
  const { head, body } = splitFrontmatter(text);
  const graph = {
    slug,
    project: head.project || slug,
    root: head.root ? stripTicks(head.root) : '',
    links: head.links || [],
    units: parseUnits(body),
  };
  graph.problems = validate(graph);
  return graph;
}

// Every projects/<slug>/graph.md under home.
export function loadGraphs(home) {
  const dir = path.join(home, 'projects');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'graph.md')))
    .map((e) => parseGraph(fs.readFileSync(path.join(dir, e.name, 'graph.md'), 'utf8'), e.name))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
