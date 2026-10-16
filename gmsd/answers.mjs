// answers.mjs — Jeff's replies, one line each in state/answers.jsonl. An answer closes the item
// it was given for while the item's fingerprint holds; if the disk changes, the item comes back.
import path from 'node:path';
import { localDate } from './paths.mjs';
import { appendJsonl, readJsonl } from './stamps.mjs';

const answersFile = (home) => path.join(home, 'state', 'answers.jsonl');

export function readAnswers(home) {
  return readJsonl(answersFile(home));
}

export function findAnswer(home, id, fingerprint) {
  return readAnswers(home).reverse().find((a) => a.id === id && a.fingerprint === fingerprint) || null;
}

// Notes Jeff gave that apply to a unit, newest last, for its next start prompt.
export function notesFor(home, unitKey) {
  return readAnswers(home)
    .filter((a) => a.unit === unitKey && a.text)
    .map((a) => `${a.on} ${a.label.replace('___', '').trim()} ${a.text}`.trim());
}

export function recordAnswer(home, record) {
  appendJsonl(answersFile(home), { ...record, on: localDate(), at: new Date().toISOString() });
}
