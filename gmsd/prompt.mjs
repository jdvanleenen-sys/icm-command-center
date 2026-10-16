// prompt.mjs — the paste-ready start prompt. The first line names the chat; it names the folder,
// the unit, what to read, what it may write and where to stop. GMSD never runs the unit itself.
import { writesFile } from './checker.mjs';
import { chatName } from './claims.mjs';
import { factApproval } from './stamps.mjs';
import { notesFor } from './answers.mjs';

function factLine(home, file) {
  const a = factApproval(home, file);
  return a.ok ? `${file} (approved by ${a.stamp.by} on ${a.stamp.on})` : `${file} (NOT approved)`;
}

export function startPrompt(world, unit) {
  const lines = [
    `Chat: ${chatName(unit.slug, unit.id)}`,
    `Folder: ${unit.root}`,
    `Unit: ${unit.id}, ${unit.title}. Graph: command-center/projects/${unit.slug}/graph.md`,
    `Read first: ${unit.start_reads.join(', ')}`,
  ];
  const owned = unit.factsAbs.filter((f) => writesFile(unit, f));
  const readOnly = unit.factsAbs.filter((f) => !writesFile(unit, f));
  if (readOnly.length) lines.push(`Shared facts (read, never edit): ${readOnly.map((f) => factLine(world.home, f)).join('; ')}`);
  if (owned.length) lines.push(`Shared facts this unit updates (Jeff re-approves them after; list every change): ${owned.join('; ')}`);
  if (unit.waits_on.length) lines.push(`Built on (done): ${unit.waits_on.join(', ')}`);
  lines.push(`You may write only: ${unit.writes.join(', ')}`);
  const upstream = unit.waits_on.map((ref) => (ref.includes(':') ? ref : `${unit.slug}:${ref}`));
  const notes = [unit.key, ...upstream].flatMap((key) => notesFor(world.home, key));
  if (notes.length) lines.push(`Jeff's answers that apply: ${notes.join(' | ')}`);
  lines.push(`Stop at: ${unit.stop_at}`);
  if (unit.returns) lines.push(`Return: ${unit.returns}, ending with a "## Missing facts" list of any fact you needed and were not given (write "- none" if none).`);
  if (unit.gate) lines.push(`Gate: ${unit.gate}. Do not pass it yourself.`);
  lines.push('Do not start any other unit. If a fact you need is missing, stop and list it; do not guess.');
  return lines.join('\n');
}
