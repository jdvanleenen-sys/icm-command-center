// Integration tests for card-sync: npm test
// Each test builds a throwaway Jeff-HQ + command-center (and, for git tests, a bare remote) in a temp dir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { syncCards, readFrontmatter } from './card-sync.mjs';

const CLAUDE = '# CC\n\n## Routing table\n| I want to… | Open |\n|---|---|\n| Work on Old | [projects/old.md](projects/old.md) |\n\n## How this works\n';
const STATUS = '# STATUS\n\n## Project board — 10 Ventures\n| Project | State | Blocker |\n|---|---|---|\n| **Old** | ok | none |\n\n## Legend\nx\n';
const OLD_CARD = '---\nproject: Old\nstate: in-progress\nupdated: 2026-09-01\nfolder: 10 Ventures/old\n---\n# Old\n';

function fixture() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'card-sync-'));
  const hqRoot = path.join(tmp, 'hq');
  const ccRoot = path.join(tmp, 'cc');
  for (const d of ['10 Ventures/old', '10 Ventures/new-thing', '10 Ventures/_graph', '40 Factory/tool']) {
    fs.mkdirSync(path.join(hqRoot, d), { recursive: true });
  }
  fs.writeFileSync(path.join(hqRoot, '10 Ventures/new-thing/CLAUDE.md'), '# The New Thing — tagline (START HERE)\n');
  fs.mkdirSync(path.join(ccRoot, 'projects'), { recursive: true });
  fs.writeFileSync(path.join(ccRoot, 'projects/old.md'), OLD_CARD);
  fs.writeFileSync(path.join(ccRoot, 'CLAUDE.md'), CLAUDE);
  fs.writeFileSync(path.join(ccRoot, 'STATUS.md'), STATUS);
  const opts = { hqRoot, ccRoot, roots: ['10 Ventures', '40 Factory', '30 Work/work'], ignore: ['10 Ventures/_graph'], today: '2026-09-23', commit: false };
  return { tmp, hqRoot, ccRoot, opts };
}

const read = (p) => fs.readFileSync(p, 'utf8');
const git = (cwd, ...a) => execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function withGit(f) {
  const remote = path.join(f.tmp, 'remote.git');
  git(f.tmp, 'init', '-q', '--bare', '-b', 'master', remote);
  git(f.ccRoot, 'init', '-q', '-b', 'master');
  git(f.ccRoot, 'config', 'user.email', 't@t');
  git(f.ccRoot, 'config', 'user.name', 't');
  git(f.ccRoot, 'config', 'core.autocrlf', 'false');
  git(f.ccRoot, 'add', '-A');
  git(f.ccRoot, 'commit', '-q', '-m', 'init');
  git(f.ccRoot, 'remote', 'add', 'origin', remote);
  git(f.ccRoot, 'push', '-q', 'origin', 'master');
  return remote;
}

test('creates a starter card, routing row and status row for each untracked folder', () => {
  const f = fixture();
  const r = syncCards(f.opts);
  assert.deepEqual(r.created.map((c) => c.rel).sort(), ['10 Ventures/new-thing', '40 Factory/tool']);
  const card = read(path.join(f.ccRoot, 'projects/new-thing.md'));
  const fm = readFrontmatter(card);
  assert.equal(fm.project, 'The New Thing');
  assert.equal(fm.state, 'new');
  assert.equal(fm.updated, '2026-09-23');
  assert.equal(fm.folder, '10 Ventures/new-thing');
  assert.equal(readFrontmatter(read(path.join(f.ccRoot, 'projects/tool.md'))).project, 'Tool');
  const claude = read(path.join(f.ccRoot, 'CLAUDE.md'));
  assert.match(claude, /\| Work on The New Thing \| \[projects\/new-thing\.md\]/);
  assert.ok(claude.indexOf('new-thing.md') < claude.indexOf('## How this works'), 'row stays inside the routing table');
  const status = read(path.join(f.ccRoot, 'STATUS.md'));
  assert.match(status, /## Project board — 40 Factory\n\| Project \| State/, 'missing room table is created');
  assert.ok(status.indexOf('## Project board — 40 Factory') < status.indexOf('## Legend'));
  assert.ok(status.indexOf('**The New Thing**') < status.indexOf('## Project board — 40 Factory'), 'row lands in its own room');
});

test('a second run creates nothing (idempotent) and ignored folders never get a card', () => {
  const f = fixture();
  syncCards(f.opts);
  const again = syncCards(f.opts);
  assert.equal(again.untracked.length, 0);
  assert.equal(again.created.length, 0);
  assert.ok(!fs.existsSync(path.join(f.ccRoot, 'projects/graph.md')));
});

test('dry run reports untracked folders but writes nothing', () => {
  const f = fixture();
  const before = read(path.join(f.ccRoot, 'CLAUDE.md'));
  const r = syncCards({ ...f.opts, dryRun: true });
  assert.equal(r.untracked.length, 2);
  assert.equal(r.created.length, 0);
  assert.equal(read(path.join(f.ccRoot, 'CLAUDE.md')), before);
  assert.ok(!fs.existsSync(path.join(f.ccRoot, 'projects/new-thing.md')));
});

test('a missing root folder is skipped, not fatal', () => {
  const f = fixture();
  const r = syncCards({ ...f.opts, roots: ['10 Ventures', 'Does Not Exist'] });
  assert.deepEqual(r.created.map((c) => c.rel), ['10 Ventures/new-thing']);
});

test('slug collision with an existing card gets a room prefix', () => {
  const f = fixture();
  fs.writeFileSync(path.join(f.ccRoot, 'projects/tool.md'), '---\nproject: Other Tool\nfolder: elsewhere/tool\n---\n');
  syncCards(f.opts);
  assert.equal(readFrontmatter(read(path.join(f.ccRoot, 'projects/factory-tool.md'))).folder, '40 Factory/tool');
});

test('git: commits only the board files and pushes to master', () => {
  const f = fixture();
  const remote = withGit(f);
  fs.writeFileSync(path.join(f.ccRoot, 'unrelated.txt'), 'leave me alone');
  const r = syncCards({ ...f.opts, commit: true });
  assert.equal(r.gitResult, 'committed and pushed');
  assert.equal(git(f.ccRoot, 'rev-parse', 'HEAD'), git(remote, 'rev-parse', 'master'));
  assert.match(git(f.ccRoot, 'log', '-1', '--name-only', '--pretty=%s'), /auto-create card\(s\).*The New Thing/);
  assert.match(git(f.ccRoot, 'status', '--porcelain'), /\?\? unrelated\.txt/, 'unrelated work is not swept in');
});

test('git: refuses to touch the board when CLAUDE.md or STATUS.md has uncommitted edits', () => {
  const f = fixture();
  withGit(f);
  fs.appendFileSync(path.join(f.ccRoot, 'STATUS.md'), 'half-finished edit\n');
  const r = syncCards({ ...f.opts, commit: true });
  assert.match(r.gitResult, /^skipped: uncommitted edits/);
  assert.equal(r.created.length, 0);
  assert.ok(!fs.existsSync(path.join(f.ccRoot, 'projects/new-thing.md')));
});

test('git: writes cards but does not commit when the repo is off master', () => {
  const f = fixture();
  withGit(f);
  git(f.ccRoot, 'checkout', '-q', '-b', 'feature/x');
  const r = syncCards({ ...f.opts, commit: true });
  assert.match(r.gitResult, /not committed: repo is on 'feature\/x'/);
  assert.equal(r.created.length, 2);
});

test('git: a failed push is reported, the commit is kept', () => {
  const f = fixture();
  withGit(f);
  git(f.ccRoot, 'remote', 'set-url', 'origin', path.join(f.tmp, 'no-such-remote.git'));
  const r = syncCards({ ...f.opts, commit: true });
  assert.match(r.gitResult, /^committed, push failed/);
  assert.match(git(f.ccRoot, 'log', '-1', '--pretty=%s'), /auto-create/);
});
