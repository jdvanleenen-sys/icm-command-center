#!/usr/bin/env node
/**
 * Local live dashboard server — no dependencies beyond Node core.
 *
 * Serves live-dashboard.html and two read/write APIs that talk directly to
 * the actual files on disk (STATUS.md's source data, projects/*.md,
 * JEFF-TASKS.md), so the dashboard can never go stale the way the old
 * hand-authored dashboard.html did — there is nothing to regenerate.
 *
 * Run: npm run dashboard   (or: node server.js)
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const ROOT = __dirname;
const PORT = 5757;
const TASKS_FILE = "JEFF-TASKS.md";
const PROJECTS_DIR = "projects";

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const write = (rel, text) => fs.writeFileSync(path.join(ROOT, rel), text, "utf8");

// --- project card parsing -------------------------------------------------

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const fm = {};
  if (m) {
    for (const line of m[1].split(/\r?\n/)) {
      const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
      if (kv) fm[kv[1]] = kv[2].trim();
    }
  }
  return { fm, bodyStart: m ? m[0].length : 0 };
}

function section(body, headerRegex) {
  const lines = body.split(/\r?\n/);
  const items = [];
  let capturing = false;
  for (const line of lines) {
    if (/^##\s/.test(line)) {
      if (capturing) break;
      capturing = headerRegex.test(line);
      continue;
    }
    if (capturing && /^-\s+/.test(line.trim())) {
      items.push(line.trim().replace(/^-\s+/, ""));
    }
  }
  return items;
}

function stateChip(state) {
  const s = (state || "").toLowerCase();
  if (/blocked/.test(s)) return "red";
  if (/unverified/.test(s)) return "red";
  if (/done/.test(s)) return "green";
  if (/ongoing|stable|active/.test(s)) return "green";
  return "amber";
}

function loadProjects() {
  const dir = path.join(ROOT, PROJECTS_DIR);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
  const projects = files.map((f) => {
    const text = fs.readFileSync(path.join(dir, f), "utf8");
    const { fm, bodyStart } = parseFrontmatter(text);
    const body = text.slice(bodyStart);
    const titleMatch = body.match(/^#\s+(.+)$/m);
    const afterTitle = titleMatch ? body.slice(body.indexOf(titleMatch[0]) + titleMatch[0].length) : body;
    const descLines = [];
    for (const l of afterTitle.split(/\r?\n/)) {
      const t = l.trim();
      if (!t) { if (descLines.length) break; else continue; }
      if (t.startsWith("**Real docs")) break;
      descLines.push(t);
    }
    const oneLiner = descLines.join(" ");
    return {
      slug: f.replace(/\.md$/, ""),
      name: fm.project || f,
      state: fm.state || "unknown",
      updated: fm.updated || null,
      chip: stateChip(fm.state),
      oneLiner,
      pending: section(body, /PENDING/),
      decisions: section(body, /NEEDS-DECISION/),
      urls: section(body, /NEEDS-URL/),
    };
  });
  const order = { red: 0, amber: 1, green: 2 };
  projects.sort((a, b) => order[a.chip] - order[b.chip]);
  return projects;
}

// --- checkbox task parsing (works on JEFF-TASKS.md) -----------------------

function loadTasks() {
  const text = read(TASKS_FILE);
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = null;
  lines.forEach((line, i) => {
    const heading = line.match(/^##\s+(.*)$/);
    if (heading) {
      current = { heading: heading[1], items: [] };
      sections.push(current);
      return;
    }
    const cb = line.match(/^(\s*)(\d+\.|-)\s*\[([ xX])\]\s*(.*)$/);
    if (cb && current) {
      current.items.push({ lineIndex: i, checked: cb[3].toLowerCase() === "x", text: cb[4] });
    }
  });
  return sections.filter((s) => s.items.length);
}

function toggleTask(lineIndex) {
  const text = read(TASKS_FILE);
  const lines = text.split(/\r?\n/);
  const line = lines[lineIndex];
  if (line == null) throw new Error("line not found");
  const m = line.match(/^(\s*(?:\d+\.|-)\s*\[)([ xX])(\]\s*.*)$/);
  if (!m) throw new Error("not a checkbox line");
  const next = m[2].trim() ? " " : "x";
  lines[lineIndex] = m[1] + next + m[3];
  write(TASKS_FILE, lines.join("\n"));
}

// --- server -----------------------------------------------------------

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/api/board" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(loadProjects()));
    return;
  }

  if (url.pathname === "/api/tasks" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(loadTasks()));
    return;
  }

  if (url.pathname === "/api/tasks/toggle" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const { lineIndex } = JSON.parse(body);
        toggleTask(lineIndex);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: String(e.message) }));
      }
    });
    return;
  }

  if (url.pathname === "/" || url.pathname === "/live-dashboard.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(read("live-dashboard.html"));
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("not found");
});

const SILENT = !!process.env.DASHBOARD_SILENT;

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.log(`Already running at http://localhost:${PORT}` + (SILENT ? "." : " — opening it."));
    if (!SILENT) exec(`start http://localhost:${PORT}`);
  } else {
    console.error(e);
  }
});

server.listen(PORT, () => {
  console.log(`Command center live dashboard: http://localhost:${PORT}`);
  if (!SILENT) exec(`start http://localhost:${PORT}`);
});
