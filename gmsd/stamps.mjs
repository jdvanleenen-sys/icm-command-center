// stamps.mjs — is a shared fact file approved? Either a stamp in the file, or an entry in
// state/approvals.jsonl whose hash matches the file as it is now (an edit lapses it).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { readIfExists, samePathKey } from './paths.mjs';

// approved by NAME on DATE · approved_by: NAME, DATE · status: approved by NAME DATE
const STAMP = /approved[ _]by:?[ \t]+([A-Za-z][\w .'-]{0,40}?),?[ \t]+(?:on[ \t]+)?(\d{4}-\d{2}-\d{2})/i;

export function findStamp(text) {
  const m = text ? text.match(STAMP) : null;
  return m ? { by: m[1].trim(), on: m[2] } : null;
}

export function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

const ledgerFile = (home) => path.join(home, 'state', 'approvals.jsonl');

export function readJsonl(file) {
  const text = readIfExists(file.replace(/\\/g, '/'));
  if (!text) return [];
  return text.split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l));
}

export function appendJsonl(file, record) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');
}

function ledgerApproval(home, file, text) {
  const entries = readJsonl(ledgerFile(home)).filter((e) => samePathKey(e.path) === samePathKey(file));
  const last = entries[entries.length - 1];
  if (!last) return null;
  return last.sha256 === sha256(text) ? { by: last.by, on: last.on, via: 'ledger' } : null;
}

// { ok, stamp } or { ok: false, reason } for one fact file.
export function factApproval(home, file) {
  const text = readIfExists(file);
  if (text == null) return { ok: false, reason: `fact file not found: ${file}` };
  const stamp = findStamp(text);
  if (stamp) return { ok: true, stamp: { ...stamp, via: 'file' } };
  const ledger = ledgerApproval(home, file, text);
  if (ledger) return { ok: true, stamp: ledger };
  return { ok: false, reason: `no "approved by NAME on DATE" stamp: ${file}` };
}

export function recordApproval(home, file, by, answerId) {
  const text = readIfExists(file);
  if (text == null) throw new Error(`cannot approve a missing file: ${file}`);
  const on = new Date().toISOString().slice(0, 10);
  appendJsonl(ledgerFile(home), { path: file, sha256: sha256(text), by, on, answerId });
}
