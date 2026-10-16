// probes.mjs — the only ways a status gets known. Each returns
// { value: true | false | null, reason }; null means unknown, never a guess.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { existsPath, readIfExists, resolvePath } from './paths.mjs';
import { factApproval, findStamp } from './stamps.mjs';

export function tokenize(text) {
  const tokens = [];
  const re = /`([^`]*)`|(\S+)/g;
  let m;
  while ((m = re.exec(text))) tokens.push(m[1] !== undefined ? m[1] : m[2]);
  return tokens;
}

const unknown = (reason) => ({ value: null, reason });
const result = (value, reason) => ({ value, reason });

// Data rows across every markdown table; header, separator and all-blank rows do not count.
export function countTableRows(text) {
  let rows = 0;
  let position = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) { position = 0; continue; }
    position += 1;
    if (position <= 2) continue;
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cells.some((c) => c && !/^[-:]+$/.test(c))) rows += 1;
  }
  return rows;
}

function readField(text, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = text.match(new RegExp(`^\\s*${escaped}:[ \\t]*([^#\\r\\n]*?)[ \\t]*(?:#.*)?$`, 'im'));
  return m ? m[1] : null;
}

function git(root, args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

function isGitRepo(root) {
  try { return git(root, ['rev-parse', '--is-inside-work-tree']).trim() === 'true'; } catch { return false; }
}

function branchNames(root, extra = []) {
  return git(root, ['branch', '-a', ...extra, '--format=%(refname:short)'])
    .split(/\r?\n/).map((b) => b.trim().replace(/^origin\//, '')).filter(Boolean);
}

function gitProbe(kind, root, branch) {
  if (!isGitRepo(root)) return unknown(`not a git repo: ${root}`);
  const names = branchNames(root);
  if (kind === 'branch') {
    const has = names.includes(branch);
    return result(has, `branch ${branch} ${has ? 'exists' : 'does not exist'}`);
  }
  const main = names.includes('main') ? 'main' : names.includes('master') ? 'master' : null;
  if (!main) return unknown(`no main or master branch in ${root}`);
  const merged = branchNames(root, ['--merged', main]).includes(branch);
  return result(merged, `${branch} ${merged ? 'is' : 'is not'} merged into ${main}`);
}

function fileProbe(kind, file, args, home) {
  const present = existsPath(file);
  if (kind === 'exists') return result(present, `${file} ${present ? 'exists' : 'does not exist'}`);
  if (kind === 'absent') return result(!present, `${file} ${present ? 'exists' : 'is absent'}`);
  const text = readIfExists(file);
  if (text == null) return result(false, `${file} does not exist`);
  if (kind === 'stamped') {
    const s = findStamp(text);
    return result(!!s, s ? `${file} approved by ${s.by} on ${s.on}` : `${file} has no approval stamp`);
  }
  if (kind === 'approved') {
    const a = factApproval(home, file);
    return result(a.ok, a.ok ? `${file} approved by ${a.stamp.by} on ${a.stamp.on} (${a.stamp.via})` : a.reason);
  }
  if (kind === 'contains' || kind === 'lacks') {
    const has = text.includes(args[0] || '');
    return result(kind === 'contains' ? has : !has, `${file} ${has ? 'contains' : 'lacks'} "${args[0]}"`);
  }
  if (kind === 'field') return fieldProbe(file, text, args[0]);
  if (kind === 'rows') return rowsProbe(file, text, args);
  return unknown(`unknown probe kind: ${kind}`);
}

function fieldProbe(file, text, pair) {
  const [key, ...rest] = (pair || '').split('=');
  const want = rest.join('=').trim().toLowerCase();
  const got = readField(text, key);
  const ok = got != null && got.toLowerCase() === want;
  return result(ok, `${file} ${key}=${got == null ? '(missing)' : got}`);
}

function rowsProbe(file, text, args) {
  const n = Number(args[1]);
  if (args[0] !== '>=' || !Number.isFinite(n)) return unknown('bad rows probe, want "rows <path> >= N"');
  const count = countTableRows(text);
  return result(count >= n, `${file} has ${count} table rows (need ${n})`);
}

// Evaluate one probe string against a project root.
// home is the GMSD repo, for the approvals ledger used by the `approved` probe.
export function evalProbe(probe, root, home) {
  const text = (probe || '').trim();
  if (!text || text === 'none') return unknown('no disk marker declared (done_when: none)');
  if (!root || !fs.existsSync(root)) return unknown(`project root not found: ${root}`);
  if (/^all\s/.test(text)) return allProbe(text.slice(4), root, home);
  const [kind, target, ...args] = tokenize(text);
  if (kind === 'branch' || kind === 'merged') return gitProbe(kind, root, target);
  if (!target) return unknown(`probe has no path: ${text}`);
  return fileProbe(kind, resolvePath(root, target), args, home);
}

function allProbe(rest, root, home) {
  const results = rest.split(';').map((p) => p.trim()).filter(Boolean).map((p) => evalProbe(p, root, home));
  const reason = results.map((r) => r.reason).join('; ');
  if (results.some((r) => r.value === false)) return result(false, reason);
  if (results.some((r) => r.value === null)) return unknown(reason);
  return result(true, reason);
}
