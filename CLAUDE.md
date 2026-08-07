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
| Know which URL/account/key I still need | [urls-and-accounts.md](urls-and-accounts.md) |
| Work on the Ignite launch | [projects/ignite.md](projects/ignite.md) |
| Work on 90 to Market | [projects/90-to-market.md](projects/90-to-market.md) |
| Work on the brand (AI the vL Way) | [projects/ai-the-vl-way.md](projects/ai-the-vl-way.md) |
| Work on marketing | [projects/marketing.md](projects/marketing.md) |
| Work on the free vibe coding course | [projects/vibe-coding-course.md](projects/vibe-coding-course.md) |
| Work on Build It Once (setup kit product) | [projects/build-it-once.md](projects/build-it-once.md) |

## How this works
- **`projects/*.md` are the single source of truth.** `STATUS.md`, `JEFF-TASKS.md`, and `dashboard.html` are **derived views** — regenerate them from the cards; never hand-edit a shared fact (a commit hash, a price) in a view without updating the card and the other views.
- Each project card has 4 buckets: ✅ DONE · ⏳ PENDING · ❓ NEEDS-DECISION · 🔗 NEEDS-URL/ACCOUNT, and POINTS to its real docs (it never copies them).
- **Before a status change is "done," run `node scripts/check-sync.js`.** It reads the source of truth (`projects/ignite.md`) and exits non-zero if any view (STATUS/JEFF-TASKS/dashboard) disagrees with it on the Ignite commit hash or a price, or if a card isn't routed here. That is the enforcement — the rule is no longer just prose.
- Phase 2: promote check-sync into a pre-commit hook or scheduled agent so the guard runs on its own.
