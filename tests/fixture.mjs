// fixture.mjs — a throwaway GMSD home plus a throwaway project root, for tests.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function makeFixture() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'gmsd-test-'));
  const home = path.join(base, 'home');
  const root = path.join(base, 'project').replace(/\\/g, '/');
  fs.mkdirSync(path.join(home, 'projects'), { recursive: true });
  fs.mkdirSync(root, { recursive: true });
  const put = (dir, rel, text) => {
    const file = path.join(dir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text, 'utf8');
    return file;
  };
  return {
    base, home, root,
    file: (rel, text) => put(root, rel, text),
    homeFile: (rel, text) => put(home, rel, text),
    graph: (slug, text) => put(home, path.join('projects', slug, 'graph.md'), text),
    cleanup: () => fs.rmSync(base, { recursive: true, force: true }),
  };
}

// A small clean project: a fact sheet, then two branches, then a fan-in.
export function cleanProject(fx, slug = 'demo') {
  fx.file('facts.md', '# Facts\n\napproved by Jeff on 2026-10-01\n');
  fx.file('a/done.md', 'approved_by: Jeff, 2026-10-02\n\n## Missing facts\n- none\n');
  fx.homeFile(`projects/${slug}/converge/merge/cross-read.md`, '# Cross-read\n1. Who is it for?\n');
  return fx.graph(slug, `---
project: Demo
root: ${fx.root}
---

## a
title: Branch A
writes: a/
facts: facts.md
done_when: stamped a/done.md
returns: a/done.md
start_reads: facts.md
stop_at: a/done.md written

## b
title: Branch B
writes: b/
facts: facts.md
done_when: exists b/done.md
returns: b/done.md
start_reads: facts.md
stop_at: b/done.md written

## merge
title: Merge
waits_on: a, b
writes: merge/
done_when: exists merge/out.md
start_reads: a/done.md, b/done.md
stop_at: merge/out.md written
`);
}
