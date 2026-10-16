// discover.mjs — Jeff-HQ project folders that nothing on the board knows about yet.
// What survived of card-sync.mjs: it finds the folders, and no longer writes cards or pushes.
// A folder is known when a projects/*.md card or a projects/<slug>/graph.md names it in `folder:`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CONFIG_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'discover.config.json');

function folderField(file) {
  try {
    const m = fs.readFileSync(file, 'utf8').match(/^---\r?\n[\s\S]*?^folder:\s*(.+?)\s*$/m);
    return m ? m[1].toLowerCase() : null;
  } catch { return null; }
}

function knownFolders(home) {
  const dir = path.join(home, 'projects');
  const known = new Set();
  if (!fs.existsSync(dir)) return known;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = e.isDirectory() ? path.join(dir, e.name, 'graph.md') : path.join(dir, e.name);
    if (!e.isDirectory() && !e.name.endsWith('.md')) continue;
    const folder = folderField(file);
    if (folder) known.add(folder);
  }
  return known;
}

export function readDiscoverConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

// [{ root, name, rel }] for every direct child of a configured root that is not known or ignored.
export function findUntracked(home, { hqRoot, roots, ignore }) {
  const known = knownFolders(home);
  const skip = new Set(ignore.map((x) => x.toLowerCase()));
  const found = [];
  for (const root of roots) {
    let entries = [];
    try { entries = fs.readdirSync(path.join(hqRoot, root), { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith('.')) continue;
      const rel = `${root}/${e.name}`;
      if (!known.has(rel.toLowerCase()) && !skip.has(rel.toLowerCase())) found.push({ root, name: e.name, rel });
    }
  }
  return found;
}
