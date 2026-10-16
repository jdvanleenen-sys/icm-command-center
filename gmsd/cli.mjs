#!/usr/bin/env node
// cli.mjs — GMSD from the terminal.
//   node gmsd/cli.mjs board [--write]        print the board summary; --write regenerates STATUS.md
//   node gmsd/cli.mjs check <slug> <unit>    list refusals (exit 1 if any)
//   node gmsd/cli.mjs start <slug> <unit>    check, write the claim, print the start prompt
//   node gmsd/cli.mjs queue                  list the open "waiting on Jeff" items
//   node gmsd/cli.mjs answer <id> <a|b|c> [text]
//   node gmsd/cli.mjs snapshot <file>        write the phone copy (publish it as the claude.ai page)
//   node gmsd/cli.mjs phone-apply <json>     apply answers sent from the phone copy; prints results
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { answerItem, startUnit } from './actions.mjs';
import { buildBoard, renderStatusMd } from './board.mjs';
import { checkUnit } from './checker.mjs';
import { applyPhoneAnswers, snapshotHtml } from './phone.mjs';
import { buildWorld, keyOf } from './world.mjs';

const HOME = process.env.GMSD_HOME || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function printBoard(write) {
  const board = buildBoard(HOME);
  for (const p of board.projects) {
    const next = p.nextUp.unit || `none (${p.nextUp.none})`;
    console.log(`${p.name}: ${JSON.stringify(p.counts)}  next up: ${next}`);
  }
  console.log(`waiting on Jeff: ${board.queue.open.length} open, ${board.queue.answered.length} answered`);
  if (write) {
    fs.writeFileSync(path.join(HOME, 'STATUS.md'), renderStatusMd(board), 'utf8');
    console.log('STATUS.md written');
  }
}

function printRefusals(refusals) {
  for (const r of refusals) console.log(`REFUSED ${r.rule}: ${r.message}`);
}

const [command, ...args] = process.argv.slice(2);
const unknownFlag = args.find((a) => a.startsWith('--') && !(command === 'board' && a === '--write'));
if (unknownFlag) {
  console.log(`ERROR: unknown flag ${unknownFlag}; nothing was done`);
  process.exit(2);
}
if (command === 'board') printBoard(args.includes('--write'));
else if (command === 'check') {
  const refusals = checkUnit(buildWorld(HOME), keyOf(args[0], args[1]));
  if (refusals.length) { printRefusals(refusals); process.exitCode = 1; } else console.log('OK: may start');
} else if (command === 'start') {
  const out = startUnit(HOME, args[0], args[1]);
  if (out.ok) console.log(out.prompt); else { printRefusals(out.refusals); process.exitCode = 1; }
} else if (command === 'queue') {
  for (const it of buildBoard(HOME).queue.open) {
    console.log(`${it.id}\n  ${it.question}\n  open: ${it.open}\n  ${it.answers.map((a) => `${a.key}) ${a.label}`).join('\n  ')}`);
  }
} else if (command === 'answer') {
  const out = answerItem(HOME, args[0], args[1], args.slice(2).join(' '));
  if (!out.ok) { console.log(`ERROR: ${out.error}`); process.exitCode = 1; } else console.log(out.followUp || 'answered');
} else if (command === 'snapshot') {
  if (!args[0]) { console.log('ERROR: give the output file'); process.exit(2); }
  fs.writeFileSync(args[0], snapshotHtml(HOME), 'utf8');
  console.log(`phone copy written: ${args[0]}`);
} else if (command === 'phone-apply') {
  if (!args[0]) { console.log('ERROR: give the answers JSON file'); process.exit(2); }
  console.log(JSON.stringify(applyPhoneAnswers(HOME, JSON.parse(fs.readFileSync(args[0], 'utf8'))), null, 2));
} else {
  console.log('usage: gmsd board [--write] | check <slug> <unit> | start <slug> <unit> | queue | answer <id> <choice> [text]');
  process.exitCode = 2;
}
