#!/usr/bin/env node
/**
 * GMSD live board — no dependencies beyond Node core.
 *
 * Every request rebuilds the board from disk (projects/<slug>/graph.md plus each project's own
 * files), so nothing can go stale and nothing is typed. Two POSTs change GMSD state, and only
 * inside this repo: /api/start (checker, then a claim and a start prompt) and /api/answer
 * (one reply closes one "waiting on Jeff" item). GMSD never runs a unit's work.
 *
 * Run: npm run dashboard   (or: node server.js). Listens on 127.0.0.1 only.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { pathToFileURL } = require("url");

const ROOT = __dirname;
const PORT = 5757;
const HOST = "127.0.0.1";
const MAX_BODY = 10 * 1024;
const SAFE_ID = /^[\w.-]+$/;
const SAFE_ITEM = /^[\w./-]+$/;

const gmsd = (name) => import(pathToFileURL(path.join(ROOT, "gmsd", name)).href);

function sendJson(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(value));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > MAX_BODY) reject(new Error("body too large"));
    });
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); } catch { reject(new Error("body is not JSON")); }
    });
  });
}

async function handleStart(req, res) {
  const { slug, unit } = await readBody(req);
  if (!SAFE_ID.test(slug || "") || !SAFE_ID.test(unit || "")) return sendJson(res, 400, { ok: false, error: "bad slug or unit" });
  const { startUnit } = await gmsd("actions.mjs");
  sendJson(res, 200, startUnit(ROOT, slug, unit));
}

async function handleAnswer(req, res) {
  const { id, choice, text } = await readBody(req);
  if (!SAFE_ITEM.test(id || "") || !/^[abc]$/.test(choice || "")) return sendJson(res, 400, { ok: false, error: "bad id or choice" });
  if (text != null && typeof text !== "string") return sendJson(res, 400, { ok: false, error: "text must be a string" });
  const { answerItem } = await gmsd("actions.mjs");
  sendJson(res, 200, answerItem(ROOT, id, choice, text || ""));
}

async function route(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  if (url.pathname === "/api/board" && req.method === "GET") {
    const { buildBoard } = await gmsd("board.mjs");
    return sendJson(res, 200, buildBoard(ROOT));
  }
  if (url.pathname === "/api/start" && req.method === "POST") return handleStart(req, res);
  if (url.pathname === "/api/answer" && req.method === "POST") return handleAnswer(req, res);
  if (url.pathname === "/" || url.pathname === "/live-dashboard.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(fs.readFileSync(path.join(ROOT, "live-dashboard.html"), "utf8"));
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("not found");
}

const server = http.createServer((req, res) => {
  route(req, res).catch((e) => sendJson(res, 500, { ok: false, error: String(e.message) }));
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

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`GMSD board: http://localhost:${PORT}`);
    if (!SILENT) exec(`start http://localhost:${PORT}`);
  });
}

module.exports = { server, route };
