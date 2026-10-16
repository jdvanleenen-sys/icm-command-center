import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { findUntracked } from '../gmsd/discover.mjs';
import { makeFixture } from './fixture.mjs';

test('finds folders no card or graph names; known and ignored folders are skipped', () => {
  const fx = makeFixture();
  try {
    const hq = path.join(fx.base, 'hq');
    for (const d of ['Ventures/new-one', 'Ventures/carded', 'Ventures/graphed', 'Ventures/skip-me', 'Ventures/.hidden']) {
      fs.mkdirSync(path.join(hq, d), { recursive: true });
    }
    fx.homeFile('projects/carded.md', '---\nproject: C\nfolder: Ventures/carded\n---\n');
    fx.homeFile('projects/graphed/graph.md', '---\nproject: G\nfolder: Ventures/graphed\n---\n');
    const found = findUntracked(fx.home, { hqRoot: hq, roots: ['Ventures', 'Missing'], ignore: ['Ventures/skip-me'] });
    assert.deepEqual(found.map((f) => f.rel), ['Ventures/new-one']);
  } finally { fx.cleanup(); }
});
