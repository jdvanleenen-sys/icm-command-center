import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { answerItem } from '../gmsd/actions.mjs';
import { buildBoard, renderStatusMd } from '../gmsd/board.mjs';
import { cleanProject, makeFixture } from './fixture.mjs';

const unitsOf = (board) => Object.fromEntries(board.projects[0].units.map((u) => [u.id, u.status]));

test('board: statuses come from disk and next up is the first ready unit', () => {
  const fx = makeFixture();
  try {
    cleanProject(fx);
    fx.homeFile('projects/old-card.md', '---\nproject: Old\nstate: done\nupdated: 2026-08-01\n---\n# Old\n');
    const board = buildBoard(fx.home);
    assert.deepEqual(unitsOf(board), { a: 'done', b: 'ready', merge: 'blocked' });
    assert.equal(board.projects[0].nextUp.unit, 'b');
    assert.match(board.projects[0].nextUp.prompt, /You may write only: b\//);
    assert.equal(board.legacy[0].name, 'Old');
    assert.ok(!('state' in board.legacy[0]), 'a typed state is never carried onto the board');
    assert.match(renderStatusMd(board), /# STATUS \(generated\)/);
  } finally { fx.cleanup(); }
});

test('board: a probe that cannot run shows unknown with its reason and a gap item', () => {
  const fx = makeFixture();
  try {
    const g = cleanProject(fx);
    fs.writeFileSync(g, fs.readFileSync(g, 'utf8').replace('done_when: exists b/done.md', 'done_when: none'));
    const board = buildBoard(fx.home);
    assert.equal(unitsOf(board).b, 'unknown');
    assert.ok(board.queue.open.some((it) => it.id === 'demo/b/gap'));
  } finally { fx.cleanup(); }
});

test('queue: every item has 1 to 3 answers, and one reply closes a fact approval', () => {
  const fx = makeFixture();
  try {
    cleanProject(fx);
    fx.file('facts.md', '# Facts\n\nnot stamped\n');
    let board = buildBoard(fx.home);
    for (const it of board.queue.open) assert.ok(it.answers.length >= 1 && it.answers.length <= 3, it.id);
    const fact = board.queue.open.find((it) => it.gate === 'fact approval');
    assert.ok(fact);
    assert.equal(answerItem(fx.home, fact.id, 'a').ok, true);
    board = buildBoard(fx.home);
    assert.ok(!board.queue.open.some((it) => it.id === fact.id));
    assert.equal(unitsOf(board).b, 'ready', 'the ledger approval counts for R3');
    fx.file('facts.md', '# Facts\n\nedited after approval\n');
    assert.ok(buildBoard(fx.home).queue.open.some((it) => it.gate === 'fact approval'), 'an edit lapses the approval');
  } finally { fx.cleanup(); }
});

test('queue: bad replies are refused and change nothing', () => {
  const fx = makeFixture();
  try {
    cleanProject(fx);
    fx.file('facts.md', '# Facts\n');
    const fact = buildBoard(fx.home).queue.open.find((it) => it.gate === 'fact approval');
    assert.equal(answerItem(fx.home, 'no/such/item', 'a').ok, false);
    assert.equal(answerItem(fx.home, fact.id, 'z').ok, false);
    assert.equal(answerItem(fx.home, fact.id, 'b', '').ok, false, 'b needs text for the ___');
    assert.ok(!fs.existsSync(path.join(fx.home, 'state', 'answers.jsonl')));
  } finally { fx.cleanup(); }
});

test('converge: an unruled difference is a ruling item, and answering it appends the ruling', () => {
  const fx = makeFixture();
  try {
    cleanProject(fx);
    fx.homeFile('projects/demo/converge/merge/differences.md', '| id | difference | branches |\n|---|---|---|\n| d1 | price differs | a, b |\n');
    const item = buildBoard(fx.home).queue.open.find((it) => it.gate === 'ruling');
    assert.equal(item.answers.length, 3);
    assert.equal(answerItem(fx.home, item.id, 'a').ok, true);
    const rulings = fs.readFileSync(path.join(fx.home, 'projects/demo/converge/merge/rulings.md'), 'utf8');
    assert.match(rulings, /\| d1 \| take a \| Jeff \|/);
    assert.ok(!buildBoard(fx.home).queue.open.some((it) => it.gate === 'ruling'));
  } finally { fx.cleanup(); }
});

test('decision unit: one reply closes it, and its answer rides into the next unit prompt', () => {
  const fx = makeFixture();
  try {
    fx.file('facts.md', '# Facts\n\napproved by Jeff on 2026-10-01\n');
    fx.graph('dec', `---\nproject: Dec\nroot: ${fx.root}\n---\n\n## pick\ntitle: Pick the colour\nwrites: none\ndone_when: answered dec/pick/gate\ngate: Jeff picks\nstart_reads: facts.md\nstop_at: answer recorded\n\n## paint\ntitle: Paint\nwaits_on: pick\nwrites: out/\ndone_when: exists out/done.md\nstart_reads: facts.md\nstop_at: out/done.md written\n`);
    let board = buildBoard(fx.home);
    assert.equal(board.projects[0].units[0].status, 'waiting on Jeff');
    assert.equal(answerItem(fx.home, 'dec/pick/gate', 'a', 'blue').ok, true);
    board = buildBoard(fx.home);
    assert.deepEqual(board.projects[0].units.map((u) => u.status), ['done', 'ready']);
    assert.match(board.projects[0].nextUp.prompt, /Jeff's answers that apply: .*blue/);
  } finally { fx.cleanup(); }
});
