#!/usr/bin/env node
// Nightly board digest for command-center.
// Scans project roots + git for the last day's activity and writes a dated digest.
// Card updates stay with the morning "apply" prompt (see the PRD). The one board edit made here:
// any Jeff-HQ project folder with no card gets a starter card, committed + pushed (card-sync.mjs).
// Run by Windows Task Scheduler at 23:00 (see run-nightly.cmd).
// Flags: --dry-run  -> write the digest, only report missing cards, do not advance state or append the run log.

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { syncCards } from './card-sync.mjs';

const GIT_ROOT = 'C:/GitHub';
const MTIME_ROOTS = [
  'C:/Users/JeffvanLeenen/OneDrive - fifthaveproperties.com/Jeff-HQ/10 Ventures',
  'C:/Users/JeffvanLeenen/OneDrive - fifthaveproperties.com/Jeff-HQ/40 Factory',
  'C:/Users/JeffvanLeenen/fifthaveproperties.com/5AP - Sales and Marketing - Documents/Design Configurator Context',
];
const COMMAND_CENTER = 'C:/GitHub/command-center';
const LOGS_DIR = path.join(COMMAND_CENTER, 'scripts', 'logs');
const STATE_FILE = path.join(COMMAND_CENTER, 'scripts', '.nightly-state.json');
const RUN_LOG = path.join(LOGS_DIR, 'run-log.jsonl');
const EXCLUDE = new Set(['node_modules', '.git', '_archive', 'dist', 'build', '.next',
  'out', 'Release', 'Debug', 'whisper.cpp', '.cache', '.venv', '__pycache__', '.turbo']);
const MAX_DEPTH = 5;
const MAX_FILES_PER_PROJECT = 40;
const WALK_BUDGET = 40000; // safety cap on entries visited per run

const DRY_RUN = process.argv.includes('--dry-run');
const now = new Date();
const nowIso = now.toISOString();
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-`
  + `${String(now.getDate()).padStart(2, '0')}`; // local date for the workday
let visited = 0;

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}

function sinceInfo() {
  const st = readState();
  const since = st.lastRunIso ? new Date(st.lastRunIso) : new Date(Date.now() - 86400000);
  return { sinceIso: since.toISOString(), sinceMs: since.getTime() };
}

function gitRepos(root) {
  const out = [];
  let entries = [];
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dir = path.join(root, e.name);
    if (fs.existsSync(path.join(dir, '.git'))) out.push(dir);
  }
  return out;
}

function gitCommits(repo, sinceIso) {
  try {
    const cmd = `git -C "${repo}" log --since="${sinceIso}" --no-merges `
      + `--pretty=format:"%h|%ad|%s" --date=short`;
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (!out) return [];
    return out.split('\n').map((l) => {
      const [h, d, ...s] = l.split('|');
      return { hash: h, date: d, subject: s.join('|') };
    });
  } catch { return []; }
}

function walk(dir, sinceMs, depth, acc) {
  if (depth > MAX_DEPTH || visited > WALK_BUDGET) return;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (visited++ > WALK_BUDGET) return;
    if (e.isDirectory()) {
      if (EXCLUDE.has(e.name)) continue;
      walk(path.join(dir, e.name), sinceMs, depth + 1, acc);
    } else if (e.isFile()) {
      let st;
      try { st = fs.statSync(path.join(dir, e.name)); } catch { continue; }
      if (st.mtimeMs >= sinceMs) acc.push({ file: path.join(dir, e.name), mtimeMs: st.mtimeMs });
    }
  }
}

function mtimeActivity(root, sinceMs) {
  const groups = {};
  let children = [];
  try { children = fs.readdirSync(root, { withFileTypes: true }); } catch { return groups; }
  for (const c of children) {
    if (c.isDirectory()) {
      if (EXCLUDE.has(c.name)) continue;
      const acc = [];
      walk(path.join(root, c.name), sinceMs, 1, acc);
      if (acc.length) groups[c.name] = acc;
    } else if (c.isFile()) {
      let st;
      try { st = fs.statSync(path.join(root, c.name)); } catch { continue; }
      if (st.mtimeMs >= sinceMs) (groups['(root files)'] ||= []).push({ file: c.name, mtimeMs: st.mtimeMs });
    }
  }
  return groups;
}

function fmtFiles(list) {
  const sorted = [...list].sort((a, b) => b.mtimeMs - a.mtimeMs);
  const shown = sorted.slice(0, MAX_FILES_PER_PROJECT);
  let s = shown.map((x) => `    - ${x.file}`).join('\n');
  if (sorted.length > shown.length) s += `\n    - …and ${sorted.length - shown.length} more`;
  return s;
}

const APPLY_HINT = 'To apply: in the command-center folder, ask Claude to read this digest, '
  + 'update the affected projects/*.md cards and regenerate STATUS.md.';

function buildDigest(sinceIso, git, mtime) {
  let d = `# Activity digest — ${stamp}\n\nSince: ${sinceIso}\n\n> ${APPLY_HINT}\n\n## Git commits\n`;
  let anyGit = false;
  for (const [repo, commits] of Object.entries(git)) {
    if (!commits.length) continue;
    anyGit = true;
    d += `\n### ${path.basename(repo)}\n`;
    d += commits.map((c) => `- ${c.date} ${c.hash} ${c.subject}`).join('\n') + '\n';
  }
  if (!anyGit) d += '\n(none)\n';
  d += '\n## File changes (non-git roots)\n';
  let anyFile = false;
  for (const [root, groups] of Object.entries(mtime)) {
    if (!Object.keys(groups).length) continue;
    anyFile = true;
    d += `\n### ${root}\n`;
    for (const [proj, files] of Object.entries(groups)) {
      d += `\n#### ${proj} (${files.length} changed)\n${fmtFiles(files)}\n`;
    }
  }
  if (!anyFile) d += '\n(none)\n';
  return d;
}

function cardSection() {
  let d = '\n## New project cards\n\n';
  try {
    const r = syncCards({ dryRun: DRY_RUN });
    if (DRY_RUN) d += r.untracked.map((u) => `- would create a card for ${u.rel}`).join('\n') || '(none missing)';
    else d += r.created.map((c) => `- created projects/${c.slug}.md (${c.title}) for ${c.rel}`).join('\n') || '(none missing)';
    return `${d}\n\ngit: ${r.gitResult}\n`;
  } catch (e) {
    return `${d}card sync failed: ${String(e.message || e).split('\n')[0]}\n`;
  }
}

function main() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  const { sinceIso, sinceMs } = sinceInfo();

  const git = {};
  for (const repo of gitRepos(GIT_ROOT)) git[repo] = gitCommits(repo, sinceIso);
  const mtime = {};
  for (const root of MTIME_ROOTS) mtime[root] = mtimeActivity(root, sinceMs);

  const digest = buildDigest(sinceIso, git, mtime) + cardSection();
  const digestPath = path.join(LOGS_DIR, `activity-${stamp}.md`);
  fs.writeFileSync(digestPath, digest);
  console.log(`digest written: ${digestPath} (visited ${visited} entries)`);

  if (DRY_RUN) { console.log('dry-run: state and run-log not advanced.'); return; }
  fs.appendFileSync(RUN_LOG, JSON.stringify({ ts: nowIso, since: sinceIso, digestPath }) + '\n');
  fs.writeFileSync(STATE_FILE, JSON.stringify({ lastRunIso: nowIso }, null, 2));
}

main();
