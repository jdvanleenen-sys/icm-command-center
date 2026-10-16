#!/usr/bin/env node
// handoff.mjs — hand-off evidence. In a throwaway copy of GMSD's home, records a SIMULATED
// answer to trades-office/run3-choices (not Jeff's; for this test only), then prints the start
// prompt GMSD would issue for run3-fixes. The prompt goes to a fresh agent with no other context.
// Run: node evidence/handoff.mjs > evidence/handoff-prompt.txt
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { answerItem } from '../gmsd/actions.mjs';
import { buildBoard } from '../gmsd/board.mjs';

const HOME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SIMULATED = 'Fix 1: (b), repeat the action rule in the shared rules text at the top of worker.py. '
  + 'Fix 3: a proposed decision does not count; item 8 passes only when the decision is filed with a decider and a date. '
  + 'Fix 4: a source that differs from the signed scope fails item 1; a date inside the signed window agrees; '
  + 'all 4 site constraints are required and "power" means working electrical service on site; '
  + 'a gap inside the signed scope is a hold: the job is not ready and a staff ask goes to the estimator.';

const base = fs.mkdtempSync(path.join(os.tmpdir(), 'gmsd-handoff-'));
try {
  fs.cpSync(path.join(HOME, 'projects'), path.join(base, 'projects'), { recursive: true });
  const out = answerItem(base, 'trades-office/run3-choices/gate', 'a', SIMULATED);
  if (!out.ok) throw new Error(out.error);
  const project = buildBoard(base).projects.find((p) => p.slug === 'trades-office');
  if (project.nextUp.unit !== 'run3-fixes') throw new Error(`next up is ${project.nextUp.unit || project.nextUp.none}, not run3-fixes`);
  console.log(project.nextUp.prompt.replaceAll(base.replace(/\\/g, '/'), HOME.replace(/\\/g, '/')));
} finally {
  fs.rmSync(base, { recursive: true, force: true });
}
