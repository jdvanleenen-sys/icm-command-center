import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { buildBoard } from '../gmsd/board.mjs';
import { applyPhoneAnswers, snapshotHtml } from '../gmsd/phone.mjs';
import { cleanProject, makeFixture } from './fixture.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('phone copy: one fragment with the board inlined and no closing script tag inside the data', () => {
  const fx = makeFixture();
  try {
    cleanProject(fx);
    fs.copyFileSync(path.join(REPO, 'live-dashboard.html'), path.join(fx.home, 'live-dashboard.html'));
    fx.file('facts.md', '# Facts </script><b>x</b>\n');
    const html = snapshotHtml(fx.home);
    assert.match(html, /^<title>GMSD Board<\/title>/);
    assert.match(html, /window\.BOARD_SNAPSHOT = \{/);
    assert.ok(!/<html|<head|<body/i.test(html), 'the publisher adds the skeleton');
    const data = html.match(/window\.BOARD_SNAPSHOT = (.*);<\/script>/)[1];
    assert.ok(!data.includes('</script>'));
  } finally { fx.cleanup(); }
});

test('phone answers: a new valid answer is applied, a bad one is refused, old ones are skipped', () => {
  const fx = makeFixture();
  try {
    cleanProject(fx);
    fx.file('facts.md', '# Facts\n');
    const fact = buildBoard(fx.home).queue.open.find((it) => it.gate === 'fact approval');
    const results = applyPhoneAnswers(fx.home, [
      { docId: 'd1', id: fact.id, choice: 'a', text: '', status: 'new' },
      { docId: 'd2', id: 'no/such/item', choice: 'a', text: '', status: 'new' },
      { docId: 'd3', id: fact.id, choice: 'a', text: '', status: 'applied' },
    ]);
    assert.deepEqual(results.map((r) => [r.docId, r.status]), [['d1', 'applied'], ['d2', 'refused']]);
    assert.ok(!buildBoard(fx.home).queue.open.some((it) => it.id === fact.id));
  } finally { fx.cleanup(); }
});
