import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { startUnit } from '../gmsd/actions.mjs';
import { checkUnit } from '../gmsd/checker.mjs';
import { writeClaim } from '../gmsd/claims.mjs';
import { buildWorld } from '../gmsd/world.mjs';
import { cleanProject, makeFixture } from './fixture.mjs';

const rules = (fx, key) => checkUnit(buildWorld(fx.home), key).map((r) => r.rule);

test('happy path: a clean project lets its branch start, and start writes a claim', () => {
  const fx = makeFixture();
  try {
    cleanProject(fx);
    assert.deepEqual(rules(fx, 'demo:b'), []);
    const out = startUnit(fx.home, 'demo', 'b');
    assert.equal(out.ok, true);
    assert.match(out.prompt, /^Chat: demo \/ b\n/);
    assert.ok(fs.existsSync(path.join(fx.home, 'state', 'claims', 'demo', 'b.json')));
    assert.equal(startUnit(fx.home, 'demo', 'b').ok, false, 'a claimed unit cannot be started twice');
  } finally { fx.cleanup(); }
});

test('R1: refuses when a running unit writes the same file', () => {
  const fx = makeFixture();
  try {
    const g = cleanProject(fx);
    fs.writeFileSync(g, fs.readFileSync(g, 'utf8').replace('writes: b/', 'writes: a/shared.md'));
    fs.rmSync(path.join(fx.root, 'a'), { recursive: true });
    writeClaim(fx.home, { slug: 'demo', unit: 'a', chat: 'demo / a', started: 'now', writes: [] });
    assert.ok(rules(fx, 'demo:b').includes('R1'));
  } finally { fx.cleanup(); }
});

test('R2: refuses when it waits on something unfinished', () => {
  const fx = makeFixture();
  try {
    cleanProject(fx);
    assert.ok(rules(fx, 'demo:merge').includes('R2'), 'b is not done');
  } finally { fx.cleanup(); }
});

test('R3: refuses when a shared fact file has no stamp', () => {
  const fx = makeFixture();
  try {
    cleanProject(fx);
    fx.file('facts.md', '# Facts\n\nno stamp here\n');
    assert.ok(rules(fx, 'demo:b').includes('R3'));
  } finally { fx.cleanup(); }
});

test('R4: refuses when an upstream unit returned missing facts', () => {
  const fx = makeFixture();
  try {
    cleanProject(fx);
    fx.file('a/done.md', 'approved_by: Jeff, 2026-10-02\n\n## Missing facts\n- the price\n');
    fx.file('b/done.md', 'done\n');
    const got = rules(fx, 'demo:merge');
    assert.ok(got.includes('R4'));
    assert.ok(!got.includes('R2'));
  } finally { fx.cleanup(); }
});

test('R5: refuses when dependencies form a loop', () => {
  const fx = makeFixture();
  try {
    const g = cleanProject(fx);
    fs.writeFileSync(g, fs.readFileSync(g, 'utf8').replace('title: Branch A\n', 'title: Branch A\nwaits_on: merge\n'));
    assert.ok(rules(fx, 'demo:a').includes('R5'));
  } finally { fx.cleanup(); }
});

test('R6: refuses a branch of a fan-in that has no cross-read list', () => {
  const fx = makeFixture();
  try {
    cleanProject(fx);
    fs.rmSync(path.join(fx.home, 'projects', 'demo', 'converge'), { recursive: true });
    assert.ok(rules(fx, 'demo:b').includes('R6'));
  } finally { fx.cleanup(); }
});
