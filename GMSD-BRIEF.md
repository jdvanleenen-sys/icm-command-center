# GMSD brief: rebuild the command center as the manager for all projects

Written 2026-10-15 about 21:30 MDT in a planning chat with Jeff. This is the plan that
governs the build. If anything in the code or chat disagrees with the definition of done
below, this file wins until Jeff changes it.

GMSD is a working name ("get more shit done"). It is GSD Core's shape (declared
dependencies, enforced by code) with Bas Rosario's graph rung on top (cut, contract, gate,
converge), for work that is not code.

## 1. Objective

One board that Jeff never types into shows every project in flight: what is running, what
waits on what, and what is waiting on him. It starts the next piece of work in its own
chat and refuses a start that would break the graph. It replaces the hand-typed board in
this repo. It does not sit beside it.

Why: `STATUS.md` here was last updated 2026-09-23, and its own header records a 2026-09-04
audit that found it 4 weeks stale and missing 12 of 19 projects. A typed board has gone
stale twice.

## 2. Decisions Jeff made (2026-10-15)

- **Home:** this repo (`C:\GitHub\command-center`, remote `icm-command-center`). The
  command center becomes GMSD.
- **Leave the curriculum build manager alone.** Do not change `C:\GitHub\animation-build`,
  the `build-manager` or `animation-build` skills, or anything in
  `10 Ventures\_business-plan\curriculum\_manager\`. GMSD may show the curriculum as one
  row that links to its own board. It never starts or gates a lesson.

## 3. Decisions taken by the planning chat (Jeff can overrule)

- **First 3 projects:** Trades Office (`10 Ventures\trades-office\`), the Control harness
  (`C:\GitHub\the-control` and `the-control-icm`), and the Idea Engine
  (`C:\GitHub\idea-engine-van-leenen`, whose `stages\*\output\done.md` files already record
  state on disk).
- **Where Jeff sees the queue:** this repo's existing live dashboard (`server.js`,
  `live-dashboard.html`, port 5757), not the curriculum manager's board.

## 4. Definition of done

**What must exist:**

1. **One project list,** generated from disk, replacing the typed tables in `STATUS.md`.
2. **Per project, a `graph.md`** listing each unit of work: what it waits on, which files
   it reads and writes, status, and the chat that owns it.
3. **A checker script** that refuses to start a unit when any of these is true:
   two running units write the same file; it waits on something unfinished; a shared fact
   file has no "approved by NAME on DATE" stamp; a returned unit still lists missing facts;
   the dependencies form a loop.
4. **One "waiting on Jeff" queue** across all projects. Each item is one question in a
   fixed shape: the gate, the question, the file to open, and the 1 to 3 answers that
   close it.
5. **A "next up" line per project worked out by code,** with a paste-ready prompt to start
   that unit in a new chat (first line names the chat; it names the folder, the unit, what
   to read, where to stop).
6. **Convergence files** wherever a project fans in: `cross-read.md` written before the
   branches run, then `differences.md` and `rulings.md`.

**Evidence (checked, not taken on the model's word):**

- **Accuracy:** on the 3 projects, every unit and status on the board matches what is on
  disk. Report the count compared and the mismatches (target 0).
- **Checker:** plant the 5 bad states in item 3 in a throwaway copy. Report caught of 5
  (target 5 of 5). The checker also passes the 3 real projects with no false refusals.
- **Hand-off:** give 1 generated start prompt to a fresh agent with no other context. It
  starts the right unit without asking a question.
- **Queue:** every queue item can be closed in one reply from Jeff.
- **Tests:** `npm test` passes, with a happy path and a failure path for the checker and the
  board builder.

**Rejected even if it looks done:**

- a second board beside this one, or `STATUS.md` kept as a typed file
- any status Jeff has to type by hand
- GMSD running a unit's work inside its own chat or process
- code or state written into OneDrive (Jeff-HQ holds docs; this repo holds code)
- any change to the curriculum manager

## 5. Read first (what already exists here)

- `CLAUDE.md`. It still routes to retired locations (`c:\my-first-workspace`, the old AI
  Systems hub). Rewrite it as part of the build.
- `server.js` and `live-dashboard.html`: a dependency-free live dashboard that already reads
  `projects/*.md` and `JEFF-TASKS.md` from disk. Build on it.
- `scripts/card-sync.mjs` (with tests), `scripts/nightly-board-update.mjs` and its PRD,
  `scripts/check-sync.js`. Decide which survive.
- `projects/*.md`: 31 hand-written cards. Several are current (Trades Office, 2026-10-06).
  They are the starting data, not the design.
- **Uncommitted work on `master` when this brief was written:** `STATUS.md`,
  `projects/build-it-once.md`, `projects/trades-office.md`. Not made by this planning chat.
  Ask Jeff before committing, stashing or discarding them.

Method, read before designing:

- `Jeff-HQ\90 Jeff Standards\playbooks\ai-engineering-ladder\cards\05_graph.md` (the cut,
  edge contracts, gates, convergence, and the GSD comparison).
- `...\cards\04_loop.md` (checks, budget, hand-back) for how you test your own build.
- `Jeff-HQ\90 Jeff Standards\playbooks\vibe-code-rules.md` and `plan-build-verify.md`.
- GSD's own version, for the declared-dependency pattern: `C:\GitHub\gsd-todo-tutorial\.claude\gsd-core\references\planner-coupling.md`
  and any `PLAN.md` frontmatter under `.planning\phases\`.

## 6. Must not

- Do not touch the curriculum manager, its skills or its repo.
- Do not edit any project's own files to make the board look right. Read them. If a
  project's state cannot be read from disk, list it as a gap for Jeff.
- Do not invent a status. "Unknown" with the reason beats a guess.
- Do not push to `master`. Work on a feature branch (`feature/gmsd-v1`), commit per working
  change, push the branch.
- No secrets in the repo. `urls-and-accounts.md` stays local.

## 7. Gates that are Jeff's

1. **After the design, before code:** the `graph.md` format, the queue item shape, and the
   list of current files to retire. One question: "Build on this, or what one thing
   changes?"
2. **After the evidence run, before merging to `master`:** the board for the 3 projects,
   the evidence numbers, and the residuals. One question: "Merge, or what one thing
   changes?"

## 8. How the build tests itself

A refinement loop on the evidence in section 4: those checks are fixed before code is
written, every attempt is judged against them (never against the previous attempt), budget
of 3 attempts, and the hand-back is the best attempt with every check's result.
