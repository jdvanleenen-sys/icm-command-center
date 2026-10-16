// paths.mjs — one way to name a file, so two units' writes can be compared.
import fs from 'node:fs';
import path from 'node:path';

const ABSOLUTE = /^([A-Za-z]:[\\/]|\/)/;

export function stripTicks(text) {
  return text.trim().replace(/^`(.*)`$/, '$1').trim();
}

// Resolve a graph path against a project root and normalise it: forward slashes, a trailing
// slash kept for folders. Comparison is case-insensitive (samePathKey), since Windows is.
export function resolvePath(root, rel) {
  const raw = stripTicks(rel);
  const isFolder = /[\\/]$/.test(raw);
  const joined = ABSOLUTE.test(raw) ? raw : path.join(root, raw);
  const norm = path.normalize(joined).replace(/\\/g, '/').replace(/\/+$/, '');
  return isFolder ? `${norm}/` : norm;
}

export function toSlash(p) {
  return p.replace(/\\/g, '/');
}

export function samePathKey(p) {
  return toSlash(p).toLowerCase();
}

// Two write targets overlap when they are the same file, or one is a folder holding the other.
export function pathsOverlap(a, b) {
  const x = samePathKey(a);
  const y = samePathKey(b);
  if (x === y) return true;
  const inside = (folder, other) => folder.endsWith('/') && (other.startsWith(folder) || `${other}/` === folder);
  return inside(x, y) || inside(y, x);
}

export function readIfExists(file) {
  try { return fs.readFileSync(file.replace(/\/$/, ''), 'utf8'); } catch { return null; }
}

export function existsPath(file) {
  return fs.existsSync(file.replace(/\/$/, ''));
}
