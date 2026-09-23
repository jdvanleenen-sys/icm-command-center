# PRD — Nightly Board Digest

## What we're building and why
A scheduled job that captures what Jeff actually did each day, so the command-center board
can stay current without depending on Jeff to report at a clean "session end" — which never
happens, because his work spans days and he switches by starting the next thing. This derives
activity from what changed on disk. (Jeff's principle: the filesystem is the state machine.)

## Target user
Jeff.

## What done looks like
Every night at 23:00, without Jeff touching anything, a dated activity digest is written that
lists what changed that day per project. Each morning, one prompt applies the latest digest to
the board (updates cards + regenerates STATUS.md).

## Decision (Jeff, this session)
Option 2 — **digest at night, one-tap apply in the morning.** The fully-autonomous version
(headless Claude editing files unattended with permissions skipped) was blocked by the harness
safety classifier on day zero; that is exactly the risk we chose not to take. The digest is the
reliable 90% of the value; the judgment step stays with Jeff present.

## How it works
1. `nightly-board-update.mjs` computes a "since" time (last successful run, or 24h).
2. Scans for activity:
   - git repos under `C:\GitHub` -> `git log --since`.
   - non-git roots (Jeff-HQ `10 Ventures`, `40 Factory`; 5AP `Design Configurator Context`)
     -> files modified since, grouped by project, with exclusions and caps.
3. Writes `scripts/logs/activity-<date>.md` (the digest), then advances state to now and appends
   a line to `scripts/logs/run-log.jsonl`. A missed night (machine off) is re-covered next run,
   because the window is "since last run," not a fixed 24h.
4. Windows Task Scheduler runs `run-nightly.cmd` daily at 23:00.

## Using it (the morning habit)
First prompt of the day, in the command-center folder:

> Read the latest scripts/logs/activity-*.md digest(s). Update the affected projects/*.md cards
> (Current Status, a dated Last Session, Next) based only on the digest, then regenerate STATUS.md.
> Add any folder with activity but no card under "Untracked — needs a card". Then tell me what changed.

## Constraints / risks
- Machine must be on at 23:00 (same as Remote Control). Missed runs re-covered next run.
- Only sees work with a file trail; in-head decisions still need the morning prompt to add.
- `claude` and `git` must be on PATH for the Task Scheduler user (git only if repos are scanned).

## New project cards (added 2026-09-23, Jeff's decision: fully automatic)
Every run also calls `card-sync.mjs`. Any direct child folder of the roots in
`card-sync.config.json` (Jeff-HQ `10 Ventures`, `40 Factory`, `30 Work/work`) that no card claims
via `folder:` frontmatter, and that isn't on the ignore list, gets a starter card (`state: new`),
a routing row in CLAUDE.md and a row in its room's STATUS.md table. It is committed and pushed to
master, because the cloud staleness check reads master. After 3 days an unfilled starter card
shows up in the staleness email, which is the nudge to fill it in.
- Guards: only commits on `master`; skips entirely if CLAUDE.md or STATUS.md has uncommitted
  edits (so it never sweeps Jeff's half-done work into its commit); a failed push is reported in
  the digest and the commit is kept for next time.
- Not a project? Delete the card and add the folder to the config's `ignore` list.
- Tests: `npm test`. Preview without writing: `npm run cards:check`.
- Task Scheduler settings: runs on battery and catches up a missed night (`StartWhenAvailable`),
  set 2026-09-23 after a battery refusal (0x800710E0) skipped the 2026-09-22 run.

## Out of scope (v1)
- Autonomous editing of existing cards (deferred; needs an explicit permission grant). Only
  starter cards for new folders are written automatically.
- Committing/pushing card edits other than new starter cards — manual for now.
- One-time manual refresh to make the board accurate on day one — done separately.
