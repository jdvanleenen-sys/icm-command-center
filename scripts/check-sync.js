#!/usr/bin/env node
/**
 * check-sync.js - drift guard for the command centre.
 *
 * projects/*.md are the SINGLE SOURCE OF TRUTH. STATUS.md, JEFF-TASKS.md and
 * dashboard.html are DERIVED VIEWS of them. This script exits non-zero if the
 * views disagree on a shared fact (the current commit hash) or a project card
 * is not routed in CLAUDE.md. Run before any status change is considered done:
 *
 *     node scripts/check-sync.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const read = (name) => {
  const p = path.join(ROOT, name);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
};

const errors = [];
const views = ["STATUS.md", "JEFF-TASKS.md", "dashboard.html"].reduce(
  (acc, n) => ((acc[n] = read(n)), acc),
  {},
);

// 1. The "current commit" reference must agree across every view that cites one.
//    (Catches the classic drift: update one surface, forget the others.)
const cited = {};
for (const [name, text] of Object.entries(views)) {
  const found = new Set();
  const re = /commit[\s\S]{0,15}?\b([0-9a-f]{7,40})\b/gi;
  let m;
  while ((m = re.exec(text)) !== null) found.add(m[1].toLowerCase());
  if (found.size) cited[name] = [...found];
}
const union = new Set(Object.values(cited).flat());
if (union.size > 1) {
  errors.push("commit hash disagrees across views: " + JSON.stringify(cited));
}

// 2. Every project card must be routed in CLAUDE.md (nothing orphaned).
const claude = read("CLAUDE.md");
for (const f of fs
  .readdirSync(path.join(ROOT, "projects"))
  .filter((f) => f.endsWith(".md"))
  .sort()) {
  const slug = f.replace(/\.md$/, "");
  if (!claude.includes(slug)) {
    errors.push(`projects/${slug}.md is not routed in CLAUDE.md`);
  }
}

if (errors.length) {
  console.log("DRIFT CHECK FAILED:");
  errors.forEach((e) => console.log("  - " + e));
  process.exit(1);
}
console.log("drift check passed: derived views agree, and every project card is routed.");
