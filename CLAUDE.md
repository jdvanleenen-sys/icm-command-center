# Command Center — Jeff's AI Ventures

The single place to see everything and route to the right shelf. This file only points; it holds no content. Open [STATUS.md](STATUS.md) to see the whole board.

## What lives where (the 4 locations)
- **This workspace** `c:\my-first-workspace` — Claude Code workspace, course notes, playbooks, and THIS command center.
- **Jeff's Brain** `C:\Jeff's Brain` — skills workshop + the `Ignite AI Academy\` project folder (app docs, launch plan, assets).
- **OneDrive AI Systems hub** `…\Jeff's AI Docs\AI Systems` — CANONICAL. `Standing Docs\` = source of truth (read-only). Front door: `AI-SYSTEM-MAP.md`.
- **Auto-memory** `…\.claude\projects\c--my-first-workspace\memory` — what Claude remembers across sessions.

> **External to this repo:** Jeff's Brain, the OneDrive hub, and auto-memory are on Jeff's machine. The `Real docs:` pointers in each project card resolve there, not from a fresh clone. This repo ships the **map** (status + routing), not the territory.

## Routing table
| I want to… | Open |
|---|---|
| See everything at a glance | [STATUS.md](STATUS.md) |
| See MY personal to-do list | [JEFF-TASKS.md](JEFF-TASKS.md) |
| Know which URL/account/key I still need | `urls-and-accounts.md` — **local only, not in the repo** (account/security details stay off GitHub) |
| Work on the Ignite launch | [projects/ignite.md](projects/ignite.md) |
| Work on 90 to Market | [projects/90-to-market.md](projects/90-to-market.md) |
| Work on the brand (AI the vL Way) | [projects/ai-the-vl-way.md](projects/ai-the-vl-way.md) |
| Work on marketing | [projects/marketing.md](projects/marketing.md) |
| Work on the free vibe coding course | [projects/vibe-coding-course.md](projects/vibe-coding-course.md) |
| Work on Build It Once (setup kit product) | [projects/build-it-once.md](projects/build-it-once.md) |
| Work on ICM Consulting (Calgary SMB setup) | [projects/icm-consulting.md](projects/icm-consulting.md) |
| Work on the festival film (The Christmas Wish) | [projects/festival-film.md](projects/festival-film.md) |
| Work on the Christmas Wish short ad | [projects/christmas-wish-short-ad.md](projects/christmas-wish-short-ad.md) |
| Work on Clief Notes | [projects/clief-notes.md](projects/clief-notes.md) |
| Work on the ICM explainer film | [projects/icm-film.md](projects/icm-film.md) |
| Work on Machine Gun Rabbit | [projects/machine-gun-rabbit.md](projects/machine-gun-rabbit.md) |
| Work on Animation Studio | [projects/animation-studio.md](projects/animation-studio.md) |
| Work on Blob Game | [projects/blob-game.md](projects/blob-game.md) |
| Work on the Customer Engine (Factory method) | [projects/customer-engine.md](projects/customer-engine.md) |
| Work on the Funnel Engine (Factory method) | [projects/funnel-engine.md](projects/funnel-engine.md) |
| Work on ICM Teacher | [projects/icm-teacher.md](projects/icm-teacher.md) |
| Work on Production Line | [projects/production-line.md](projects/production-line.md) |
| Work on Skill Bundles | [projects/skill-bundles.md](projects/skill-bundles.md) |
| Work on AI Venture Strategist | [projects/ai-venture-strategist.md](projects/ai-venture-strategist.md) |
| Work on Build Don't Rent | [projects/build-dont-rent.md](projects/build-dont-rent.md) |
| Work on The School | [projects/business-plan.md](projects/business-plan.md) |
| Work on AI the vL Way Talk | [projects/ai-the-vl-way-talk.md](projects/ai-the-vl-way-talk.md) |
| Work on Remotion Video Machine | [projects/remotion-video-machine.md](projects/remotion-video-machine.md) |

## How this works
- **`projects/*.md` are the single source of truth.** `STATUS.md`, `JEFF-TASKS.md`, and `dashboard.html` are **derived views** — regenerate them from the cards; never hand-edit a shared fact (a commit hash, a price) in a view without updating the card and the other views.
- Each project card has 4 buckets: ✅ DONE · ⏳ PENDING · ❓ NEEDS-DECISION · 🔗 NEEDS-URL/ACCOUNT, and POINTS to its real docs (it never copies them).
- **New projects get a card automatically.** Each card names its Jeff-HQ folder in `folder:` frontmatter. Every night `scripts/card-sync.mjs` gives any project folder in `10 Ventures`, `40 Factory` or `30 Work/work` with no card a starter card (`state: new`), routes it here, adds it to STATUS.md, and pushes to master. Not a project? Delete the card and add the folder to `scripts/card-sync.config.json` → `ignore`. Details: [scripts/nightly-board-update.PRD.md](scripts/nightly-board-update.PRD.md).
- **Drift guard — what each path actually does.** `scripts/check-sync.js` reads the source of truth (`projects/ignite.md`) and fails if any view (STATUS/JEFF-TASKS/dashboard) disagrees with it on the Ignite commit hash, a price, or the numbered-task count, or if a card isn't routed. Enforcement paths, stated honestly:
  - `npm run check` (or `node scripts/check-sync.js`) — by hand. Works, verified.
  - **CI** (`.github/workflows/check-sync.yml`) — runs on every push and goes red on drift, but only *blocks* a change if branch protection on `master` is set to require the `check-sync` check. Until then it surfaces drift, it doesn't gate it.
  - **Pre-commit hook** (`.githooks/pre-commit`, committed executable) — blocks a bad local commit once enabled: `git config core.hooksPath .githooks`.
  So: the by-hand check works, the hook works when enabled, and CI becomes a true gate only with branch protection on. Not fully automatic until then — that's the honest status.
