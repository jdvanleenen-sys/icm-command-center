import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseGraph } from '../gmsd/graph.mjs';
import { pathsOverlap } from '../gmsd/paths.mjs';
import { countTableRows, evalProbe } from '../gmsd/probes.mjs';
import { findStamp } from '../gmsd/stamps.mjs';
import { missingFacts } from '../gmsd/world.mjs';
import { makeFixture } from './fixture.mjs';

test('graph parser reads units, lists and frontmatter', () => {
  const g = parseGraph('---\nproject: P\nroot: C:/x\n---\n\n## u1\ntitle: T\nwaits_on: a, b\nwrites: `out/`\ndone_when: exists out/x.md\nstart_reads: r.md\nstop_at: s\n', 'p');
  assert.equal(g.project, 'P');
  assert.equal(g.units.length, 1);
  assert.deepEqual(g.units[0].waits_on, ['a', 'b']);
  assert.deepEqual(g.units[0].writes, ['out/']);
  assert.deepEqual(g.problems, []);
});

test('graph parser names missing required fields and duplicate ids', () => {
  const g = parseGraph('---\nproject: P\nroot: C:/x\n---\n## u1\ntitle: T\n## u1\ntitle: T\n', 'p');
  assert.ok(g.problems.some((p) => p.includes('no writes')));
  assert.ok(g.problems.some((p) => p.includes('declared twice')));
  assert.ok(g.problems.some((p) => p.includes('sets title twice')));
});

test('stamp formats on disk are accepted; blank template lines are not', () => {
  assert.deepEqual(findStamp('approved by Jeff on 2026-10-01'), { by: 'Jeff', on: '2026-10-01' });
  assert.equal(findStamp('approved_by: Jeff, 2026-09-29 (note)').by, 'Jeff');
  assert.equal(findStamp('status: approved by Jeff 2026-09-29 (revision 3)').on, '2026-09-29');
  assert.equal(findStamp('approved_by:        # the person who read this, blank = not done'), null);
  assert.equal(findStamp('stamp: approved by NAME on DATE'), null);
});

test('table rows skip header, separator and blank template rows', () => {
  const text = '| When | Who |\n|---|---|\n| 2026-10-01 | A |\n|  |  |\n| 2026-10-02 | B |\n';
  assert.equal(countTableRows(text), 2);
});

test('probes return true, false, or unknown with a reason', () => {
  const fx = makeFixture();
  try {
    fx.file('x.md', '---\nready: yes\n---\nhello world\n');
    assert.equal(evalProbe('exists x.md', fx.root).value, true);
    assert.equal(evalProbe('exists nope.md', fx.root).value, false);
    assert.equal(evalProbe('absent nope.md', fx.root).value, true);
    assert.equal(evalProbe('field x.md ready=yes', fx.root).value, true);
    assert.equal(evalProbe('contains x.md `hello world`', fx.root).value, true);
    assert.equal(evalProbe('all exists x.md; exists nope.md', fx.root).value, false);
    assert.equal(evalProbe('none', fx.root).value, null);
    assert.equal(evalProbe('exists x.md', 'C:/does/not/exist').value, null);
    assert.equal(evalProbe('branch main', fx.root).value, null);
  } finally { fx.cleanup(); }
});

test('write overlap: same file, folder holding file, but not siblings', () => {
  assert.ok(pathsOverlap('C:/p/a.md', 'c:/P/A.md'));
  assert.ok(pathsOverlap('C:/p/out/', 'C:/p/out/x.md'));
  assert.ok(!pathsOverlap('C:/p/out/', 'C:/p/output/x.md'));
  assert.ok(!pathsOverlap('C:/p/a.md', 'C:/p/b.md'));
});

test('missing facts list: none counts as empty', () => {
  assert.deepEqual(missingFacts('## Missing facts\n- none\n'), []);
  assert.deepEqual(missingFacts('x\n## Missing facts\n- the host list\n- a date\n## Next\n- y\n'), ['the host list', 'a date']);
  assert.deepEqual(missingFacts('no heading'), []);
});
