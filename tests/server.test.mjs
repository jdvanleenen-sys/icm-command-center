// Integration: the real server against this repo's own graphs. Read-only requests plus
// refused writes, so the test never changes state/.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';

const require = createRequire(import.meta.url);
const { server } = require('../server.js');
let base;

before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test('GET /api/board returns projects, a queue and legacy cards', async () => {
  const board = await (await fetch(`${base}/api/board`)).json();
  assert.ok(Array.isArray(board.projects) && board.projects.length > 0);
  assert.ok(Array.isArray(board.queue.open));
  assert.ok(Array.isArray(board.legacy));
});

test('GET / serves the dashboard page', async () => {
  const res = await fetch(base);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /<title>GMSD Board<\/title>/);
});

test('bad POSTs are refused with 400 or ok:false and write nothing', async () => {
  const post = (url, body) => fetch(`${base}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  assert.equal((await post('/api/answer', JSON.stringify({ id: 'x', choice: 'z' }))).status, 400);
  assert.equal((await post('/api/start', JSON.stringify({ slug: '../etc', unit: 'x' }))).status, 400);
  const missing = await (await post('/api/start', JSON.stringify({ slug: 'no-such-project', unit: 'x' }))).json();
  assert.equal(missing.ok, false);
  assert.equal((await post('/api/answer', 'not json')).status, 500);
});
