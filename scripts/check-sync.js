#!/usr/bin/env node
/**
 * check-sync.js - drift guard for the command centre.
 *
 * projects/*.md are the SINGLE SOURCE OF TRUTH. STATUS.md, JEFF-TASKS.md and
 * dashboard.html are DERIVED VIEWS. This script exits non-zero if a view
 * disagrees with the source of truth on a guarded fact (the Ignite commit
 * hash or a price), or if a project card is not routed in CLAUDE.md.
 * Run before any status change is considered done:  node scripts/check-sync.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const read = (name) => {
  const p = path.join(ROOT, name);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
};

const errors = [];

// Source of truth for the guarded facts: the Ignite project card.
const SOURCE = "projects/ignite.md";
const source = read(SOURCE);
const grabHash = (t) => {
  const m = t.match(/commit[\s\S]{0,15}?\b([0-9a-f]{7,40})\b/i);
  return m ? m[1].toLowerCase() : null;
};
const grabPrices = (t) => new Set(t.match(/\$\d+\.\d{2}/g) || []);

const srcHash = grabHash(source);
const srcPrices = grabPrices(source);

for (const name of ["STATUS.md", "JEFF-TASKS.md", "dashboard.html"]) {
  const text = read(name);

  // Commit hash: any hash a view cites must equal the source's.
  const h = grabHash(text);
  if (h && srcHash && h !== srcHash) {
    errors.push(`${name}: commit ${h} disagrees with source ${srcHash} (${SOURCE})`);
  }

  // Prices: a view must not carry a price the source of truth does not have.
  for (const p of grabPrices(text)) {
    if (srcPrices.size && !srcPrices.has(p)) {
      errors.push(`${name}: price ${p} not in source of truth [${[...srcPrices].join(", ")}] (${SOURCE})`);
    }
  }
}

// Every project card must be routed in CLAUDE.md (nothing orphaned).
const claude = read("CLAUDE.md");
for (const f of fs
  .readdirSync(path.join(ROOT, "projects"))
  .filter((f) => f.endsWith(".md"))
  .sort()) {
  const slug = f.replace(/\.md$/, "");
  if (!claude.includes(slug)) errors.push(`projects/${slug}.md is not routed in CLAUDE.md`);
}

if (errors.length) {
  console.log("DRIFT CHECK FAILED:");
  errors.forEach((e) => console.log("  - " + e));
  process.exit(1);
}
console.log(
  `drift check passed: views agree with source of truth (${SOURCE}) ` +
    `on commit ${srcHash} and prices [${[...srcPrices].join(", ")}]; all cards routed.`,
);
