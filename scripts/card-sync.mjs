#!/usr/bin/env node
// card-sync.mjs — give every Jeff-HQ project folder a card on the board.
//
// A project folder is any direct child of a root in card-sync.config.json (e.g. 10 Ventures/x).
// A folder is tracked when some projects/*.md card has `folder: <root>/<name>` in its frontmatter,
// or it is on the config's ignore list. Every untracked folder gets a starter card (state: new),
// a routing row in CLAUDE.md and a row in its room's STATUS.md table, then the change is committed
// and pushed to master so the cloud staleness check sees it.
//
//   node scripts/card-sync.mjs            create cards, commit, push
//   node scripts/card-sync.mjs --dry-run  list what would be created, change nothing
//
// Also imported by nightly-board-update.mjs, which runs it every night.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const COMMAND_CENTER = path.resolve(HERE, '..');
const CONFIG_FILE = path.join(HERE, 'card-sync.config.json');
const BOARD_FILES = ['CLAUDE.md', 'STATUS.md'];
const PUSH_BRANCH = 'master';

export function readFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = {};
  if (m) for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

function trackedFolders(ccRoot) {
  const dir = path.join(ccRoot, 'projects');
  const tracked = new Set();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const folder = readFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8')).folder;
    if (folder) tracked.add(folder.toLowerCase());
  }
  return tracked;
}

export function findUntracked({ hqRoot, roots, ignore, ccRoot }) {
  const tracked = trackedFolders(ccRoot);
  const skip = new Set(ignore.map((x) => x.toLowerCase()));
  const found = [];
  for (const root of roots) {
    let entries = [];
    try { entries = fs.readdirSync(path.join(hqRoot, root), { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith('.')) continue;
      const rel = `${root}/${e.name}`;
      if (!tracked.has(rel.toLowerCase()) && !skip.has(rel.toLowerCase())) found.push({ root, name: e.name, rel });
    }
  }
  return found;
}

function titleize(name) {
  return name.replace(/^[^a-z0-9]+/i, '').split(/[-_\s]+/).filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

// Prefer the folder's own heading (CLAUDE.md / CONTEXT.md / README.md), cut to its short name.
export function projectTitle(dir, name) {
  for (const f of ['CLAUDE.md', 'CONTEXT.md', 'README.md']) {
    let text;
    try { text = fs.readFileSync(path.join(dir, f), 'utf8'); } catch { continue; }
    const h = text.match(/^#\s+(.+)$/m);
    if (!h) continue;
    const short = h[1].replace(/\(.*?\)/g, '').split(/\s+[—–-]\s+/)[0].trim();
    if (short && !/^(start here|claude|context|readme)\b/i.test(short)) return short;
  }
  return titleize(name);
}

function uniqueSlug(ccRoot, name, root) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  let slug = base;
  const prefix = root.split('/')[0].replace(/^\d+\s*/, '').toLowerCase();
  if (fs.existsSync(path.join(ccRoot, 'projects', `${slug}.md`))) slug = `${prefix}-${base}`;
  let n = 2;
  while (fs.existsSync(path.join(ccRoot, 'projects', `${slug}.md`))) slug = `${prefix}-${base}-${n++}`;
  return slug;
}

export function starterCard({ title, rel, today }) {
  return `---
project: ${title}
state: new
updated: ${today}
folder: ${rel}
---
# ${title}
Starter card, auto-created ${today} by the nightly board job because this folder had no card.
**Real docs:** Jeff-HQ OneDrive — \`${rel.replace(/\//g, '\\')}\\\`.

## ✅ DONE
- none recorded yet

## ⏳ PENDING
- **Set this card up:** one-line description, a real \`state:\`, and the next action. If this folder is not a project, delete this card and add \`${rel}\` to the ignore list in \`scripts/card-sync.config.json\`.

## ❓ NEEDS-DECISION
- none

## 🔗 NEEDS-URL / ACCOUNT
- none
`;
}

// Insert `row` after the last table row that follows `heading`; returns null if heading is absent.
export function insertTableRow(text, heading, row) {
  const lines = text.split(/\r?\n/);
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const h = lines.findIndex((l) => l.trim() === heading);
  if (h < 0) return null;
  let i = h + 1;
  while (i < lines.length && !lines[i].startsWith('|')) i++;
  while (i < lines.length && lines[i].startsWith('|')) i++;
  lines.splice(i, 0, row);
  return lines.join(eol);
}

function routeCard(ccRoot, slug, title) {
  const file = path.join(ccRoot, 'CLAUDE.md');
  const row = `| Work on ${title} | [projects/${slug}.md](projects/${slug}.md) |`;
  const next = insertTableRow(fs.readFileSync(file, 'utf8'), '## Routing table', row);
  if (next === null) throw new Error('CLAUDE.md has no "## Routing table" section');
  fs.writeFileSync(file, next);
}

function addStatusRow(ccRoot, root, slug, title, today) {
  const file = path.join(ccRoot, 'STATUS.md');
  const room = root.split('/')[0];
  const heading = `## Project board — ${room}`;
  const row = `| **${title}** | 🆕 New | Auto-created ${today}: set description, state and next action → [card](projects/${slug}.md) |`;
  let text = fs.readFileSync(file, 'utf8');
  let next = insertTableRow(text, heading, row);
  if (next === null) {
    const section = `${heading}\n| Project | State | The one thing blocking progress |\n|---|---|---|\n${row}\n\n`;
    const at = text.indexOf('## Legend');
    next = at < 0 ? `${text.trimEnd()}\n\n${section}` : text.slice(0, at) + section + text.slice(at);
  }
  fs.writeFileSync(file, next);
}

export function createCards(opts, untracked) {
  const created = [];
  for (const u of untracked) {
    const title = projectTitle(path.join(opts.hqRoot, u.rel), u.name);
    const slug = uniqueSlug(opts.ccRoot, u.name, u.root);
    fs.writeFileSync(path.join(opts.ccRoot, 'projects', `${slug}.md`), starterCard({ title, rel: u.rel, today: opts.today }));
    routeCard(opts.ccRoot, slug, title);
    addStatusRow(opts.ccRoot, u.root, slug, title, opts.today);
    created.push({ slug, title, rel: u.rel });
  }
  return created;
}

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

// Board files with edits nobody committed yet: committing them would sweep those edits in.
export function dirtyBoardFiles(ccRoot) {
  return git(ccRoot, 'status', '--porcelain', '--', ...BOARD_FILES).split('\n').filter(Boolean);
}

function commitAndPush(ccRoot, created) {
  const branch = git(ccRoot, 'rev-parse', '--abbrev-ref', 'HEAD');
  if (branch !== PUSH_BRANCH) return `not committed: repo is on '${branch}', not ${PUSH_BRANCH}`;
  const files = [...BOARD_FILES, ...created.map((c) => `projects/${c.slug}.md`)];
  git(ccRoot, 'add', '--', ...files);
  const names = created.map((c) => c.title).join(', ');
  git(ccRoot, 'commit', '-m', `chore: auto-create card(s) for new project(s): ${names}`, '--', ...files);
  try { git(ccRoot, 'push', 'origin', PUSH_BRANCH); } catch (e) { return `committed, push failed: ${String(e.message).split('\n')[0]}`; }
  return 'committed and pushed';
}

function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function loadOptions(overrides = {}) {
  const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  return { ccRoot: COMMAND_CENTER, today: localDate(), commit: true, dryRun: false, ...cfg, ...overrides };
}

// Returns { untracked, created, gitResult } — never throws on git problems, so the nightly digest still lands.
export function syncCards(overrides = {}) {
  const opts = loadOptions(overrides);
  const untracked = findUntracked(opts);
  if (opts.dryRun || !untracked.length) return { untracked, created: [], gitResult: 'nothing to do' };
  if (opts.commit) {
    const dirty = dirtyBoardFiles(opts.ccRoot);
    if (dirty.length) return { untracked, created: [], gitResult: `skipped: uncommitted edits in ${dirty.join('; ')}` };
  }
  const created = createCards(opts, untracked);
  let gitResult = 'not committed (commit disabled)';
  if (opts.commit) {
    try { gitResult = commitAndPush(opts.ccRoot, created); } catch (e) { gitResult = `git error: ${String(e.message).split('\n')[0]}`; }
  }
  return { untracked, created, gitResult };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = syncCards({ dryRun: process.argv.includes('--dry-run') });
  for (const u of r.untracked) console.log(`untracked: ${u.rel}`);
  for (const c of r.created) console.log(`created: projects/${c.slug}.md (${c.title}) for ${c.rel}`);
  console.log(`git: ${r.gitResult}`);
}
