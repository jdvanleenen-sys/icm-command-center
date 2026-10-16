// actions.mjs — the two things that change GMSD state: starting a unit and answering an item.
// Both write only inside the GMSD repo (state/, projects/<slug>/converge/). Never a project file.
import { chatName, writeClaim } from './claims.mjs';
import { localDate } from './paths.mjs';
import { checkUnit } from './checker.mjs';
import { appendRuling } from './converge.mjs';
import { recordAnswer } from './answers.mjs';
import { startPrompt } from './prompt.mjs';
import { buildQueue } from './queue.mjs';
import { recordApproval } from './stamps.mjs';
import { buildWorld, isDone, keyOf } from './world.mjs';

const MAX_TEXT = 2000;
const ANSWERER = 'Jeff';

// { ok: true, prompt } after writing the claim, or { ok: false, refusals }.
export function startUnit(home, slug, unitId) {
  const world = buildWorld(home);
  const key = keyOf(slug, unitId);
  const unit = world.units.get(key);
  if (!unit) return { ok: false, refusals: [{ rule: 'R0', message: `no unit ${key} in any graph` }] };
  if (isDone(unit)) return { ok: false, refusals: [{ rule: 'R0', message: `${key} is already done` }] };
  if (unit.claim) return { ok: false, refusals: [{ rule: 'R0', message: `${key} is already claimed by ${unit.claim.chat}` }] };
  const refusals = checkUnit(world, key);
  if (refusals.length) return { ok: false, refusals };
  const claim = { slug, unit: unitId, chat: chatName(slug, unitId), started: new Date().toISOString(), writes: unit.writesAbs };
  writeClaim(home, claim);
  return { ok: true, prompt: startPrompt(world, unit), claim };
}

function signPrompt(world, it) {
  const unit = world.units.get(it.unit);
  return [
    `Chat: ${chatName(unit.slug, unit.id)} / sign`,
    `Folder: ${unit.root}`,
    `Jeff approved ${it.open} in GMSD on ${localDate()}.`,
    `Record that approval in the file the way this project's own rule says (for example "approved_by: Jeff, <date>"). Change nothing else.`,
  ].join('\n');
}

function validate(it, choice, text) {
  if (!it) return 'no open queue item with that id';
  const answer = it.answers.find((a) => a.key === choice);
  if (!answer) return `choice must be one of ${it.answers.map((a) => a.key).join(', ')}`;
  const needsText = answer.label.includes('___');
  if (needsText && !String(text || '').trim()) return 'this answer needs text for the ___';
  if (String(text || '').length > MAX_TEXT) return `text is over ${MAX_TEXT} characters`;
  return null;
}

function perform(home, world, it, answer, text) {
  if (answer.action === 'approve-fact' || answer.action === 'approve-return') {
    recordApproval(home, answer.target, ANSWERER, it.id);
  }
  if (answer.action === 'append-ruling') {
    const ruling = answer.label.includes('___') ? `${answer.ruling} ${text}` : answer.ruling;
    appendRuling(it.rulingsFile, it.differenceId, ruling, ANSWERER);
  }
  return answer.signNeeded ? signPrompt(world, it) : null;
}

// One reply closes one item. Returns { ok, followUp } or { ok: false, error }.
export function answerItem(home, id, choice, text = '') {
  const world = buildWorld(home);
  const it = buildQueue(world).open.find((x) => x.id === id);
  const error = validate(it, choice, text);
  if (error) return { ok: false, error };
  const answer = it.answers.find((a) => a.key === choice);
  const followUp = perform(home, world, it, answer, text);
  recordAnswer(home, {
    id, fingerprint: it.fingerprint, unit: it.unit || null, choice, label: answer.label,
    action: answer.action, text: String(text || '').trim(), followUp,
  });
  return { ok: true, followUp };
}
