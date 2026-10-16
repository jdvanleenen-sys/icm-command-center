# GMSD v1 design (gate 1)

Written 2026-10-15, about 21:45 MDT, on `feature/gmsd-v1`. Governed by `GMSD-BRIEF.md`; where
they disagree, the brief wins. Design only. No code has been written.

## 0. The one idea

**Structure is declared once. Status is computed every time.**

A `graph.md` says what the units are, what each waits on, what it reads and writes, and *how
to tell from disk that it is done*. It never holds a status. The board runs each unit's probe
against the project's own files on every request. Nobody types a status, Jeff included.

GMSD reads project folders and never writes to them. It writes only inside this repo: graphs,
claims, approvals, answers and convergence files.

## 1. Where things live (all in this repo, none in OneDrive)

```
projects/<slug>/graph.md          declared units (written by a planning chat, not by Jeff)
projects/<slug>/converge/<unit>/  cross-read.md, differences.md, rulings.md
projects/<slug>.md                legacy cards for projects with no graph yet (read-only data)
state/claims/<slug>/<unit>.json   written by `gmsd start`: chat name, started, writes
state/approvals.jsonl             approvals of shared facts, keyed by path plus sha256
state/answers.jsonl               Jeff's queue replies, one line each
gmsd/                             the code: graph parser, probes, checker, board, prompt builder
```

`state/` is committed, so the history of who started what, and when, sits in git.

## 2. The `graph.md` format

Plain markdown with `key: value` lines, the same style the current card parser reads. No YAML
library is needed, so the zero-dependency rule holds.

```markdown
---
project: Idea Engine
root: C:/GitHub/idea-engine-van-leenen
links: []                       # curriculum-style rows put their own board's URL here and no units
---

## 01-founder-recall
title: Founder recall study
waits_on: 00-contain-define
reads: _shared/PRD.md, stages/00_contain-define/output/done.md
writes: stages/01_founder-recall/output/
facts: _shared/PRD.md
done_when: stamped stages/01_founder-recall/output/done.md
returns: stages/01_founder-recall/output/done.md
gate: Jeff signs done.md
start_reads: CONTEXT.md, stages/01_founder-recall/CONTEXT.md
stop_at: done.md written, unsigned
```

| Field | Required | Meaning |
|---|---|---|
| `## <id>` | yes | Unit id, unique in the project. `<slug>:<id>` points at another project |
| `title` | yes | One line |
| `waits_on` | no | Unit ids that must be done first |
| `reads` / `writes` | `writes` yes | Paths relative to `root`. A trailing `/` means the whole folder |
| `facts` | no | Shared fact files. Each must carry an approval stamp (rule 3) |
| `done_when` | yes | A probe (table below). Its result is the unit's status |
| `returns` | no | The file the unit hands back. Its `Missing facts` list is read by rule 4 |
| `gate` | no | The unit ends at a decision of Jeff's. That decision becomes a queue item |
| `start_reads`, `stop_at` | yes | Go into the start prompt |

**Probes.** These are the only ways a status gets known. The set is fixed and small:

| Probe | True when |
|---|---|
| `exists <path>` | the file or folder exists |
| `stamped <path>` | the file has an approval stamp (formats below) |
| `field <path> <key>=<value>` | a frontmatter or `key:` line has that value |
| `rows <path> >= N` | a markdown table has at least N data rows |
| `merged <branch>` | the branch is merged into the repo's main branch (`root` must be a git repo) |
| `all <probe>; <probe>` | every listed probe is true |

**Status is derived like this, in order:**

1. `done`: the `done_when` probe is true.
2. `running`: a claim exists and the unit is not done. The owner chat is read from the claim.
3. `ready`: every unit in `waits_on` is done and the checker passes.
4. `blocked`: the checker names a rule, and the board shows which one.
5. `unknown`: the probe could not run (missing root, path outside root, not a git repo). The
   reason is shown and the unit becomes a gap item for Jeff. Nothing is guessed.

**Stamp formats accepted.** These match what is already on disk, so no project file needs
editing:

- `approved by NAME on DATE`
- `approved_by: NAME, DATE` (the Idea Engine's `done.md`)
- `status: approved by NAME DATE` (the Idea Engine's `PRD.md`)
- a line in `state/approvals.jsonl` for that path whose sha256 matches the file as it is now.
  When the file changes, the approval lapses on its own. That is "changes go through the top",
  enforced by code.

## 3. The checker: `gmsd check <slug> <unit>`, also run by `gmsd start`

It refuses with a named rule, and the reason is a file path:

| # | Refuses when | How it knows |
|---|---|---|
| R1 | Two running units would write the same file | This unit's `writes` overlaps the `writes` in any open claim, checked as path prefixes, across all projects |
| R2 | It waits on something unfinished | A `waits_on` unit is not `done` |
| R3 | A shared fact file has no stamp | A `facts` file fails `stamped` |
| R4 | A returned unit still lists missing facts | An upstream unit's `returns` file has a non-empty `## Missing facts` list |
| R5 | The dependencies form a loop | A cycle in `waits_on`, cross-project edges included. This is checked on load, so it flags the whole project |
| R6 | Fan-in without a cross-read list | A unit with 2 or more `waits_on` that ran in parallel needs `converge/<unit>/cross-read.md` committed before the first branch's claim |

R1 to R5 are the brief's 5 rules. R6 enforces brief item 6. Every rule is exact, so it is code.
The Jev test says code, and no model judges a refusal.

**`gmsd start <slug> <unit>`** runs the checker. On a pass, it writes the claim and prints the
start prompt. It never runs the unit. A claim closes when the unit's probe turns `done`.

## 4. The "waiting on Jeff" item

Every item is generated by code from the graph and the disk. None is typed.

```
id:       idea-engine/01-founder-recall/gate
project:  Idea Engine
gate:     unit gate | fact approval | missing facts | ruling | gap
question: Sign 01 Founder recall's done.md?               (one sentence, ends in ?)
open:     C:/GitHub/idea-engine-van-leenen/stages/01_founder-recall/output/done.md
answers:
  a: Yes, sign it    -> start prompt for a 1-line chat that adds the approved_by line
  b: No, rework: ___ -> your note goes into the unit's next start prompt
blocks:   02-founder-cases
```

| Kind | Made when | Typical answers |
|---|---|---|
| fact approval | R3 fails on a fact file | a: approve as it is now (GMSD writes `approvals.jsonl` with the hash). b: change first: ___ |
| unit gate | a `gate` unit's probe is not yet done, but its output exists | a: approve. b: rework: ___ |
| missing facts | R4 fails | a: here is the fact: ___ (goes into the rerun prompt). b: the fact belongs upstream, so rerun `<unit>` |
| ruling | a row in `differences.md` has no ruling | a: take branch X. b: take branch Y. c: name the gap and assign it to ___ |
| gap | a probe is `unknown` | a: here is the disk marker to read: ___. b: drop the unit from the graph |

Rules: one question per item, 1 to 3 answers, and every answer maps to one code action. The
dashboard shows the answers as buttons, with a text field for the `___`. A reply is written to
`state/answers.jsonl`. A reply never edits a project file. When a project file needs to change,
the reply turns into a start prompt for a chat that makes the change.

## 5. Next up and the start prompt

**Next up** is the first `ready` unit in topological order, with ties broken by the order in
`graph.md`. If no unit is ready, the line names the blocking rule or the queue item.

```
Chat: idea-engine / 02-founder-cases
Folder: C:/GitHub/idea-engine-van-leenen
Unit: 02-founder-cases, Founder cases study. Graph: command-center/projects/idea-engine/graph.md
Read first: CONTEXT.md, stages/02_founder-cases/CONTEXT.md, _shared/PRD.md (approved by Jeff 2026-09-29)
You may write only: stages/02_founder-cases/output/
Stop at: done.md written, unsigned. Return done.md with a "## Missing facts" list (empty if none).
Do not start any other unit.
```

## 6. What the 3 projects look like on disk (scan, 2026-10-15)

| Project | Disk marker today | What the graph can read | Gaps for Jeff |
|---|---|---|---|
| Idea Engine | `stages/*/output/done.md` with `approved_by`; PRD stamped | Every stage, through `stamped` | In-progress stages have no marker beyond a branch. 01x has no `waits_on` and runs beside 01 and 02 |
| The Control (`the-control-icm`) | 11-step `PLAN.md`; each step leaves a file (`GATE-1.md`, `FREEZE.md`, `RESULTS.md`) | Most steps, through `exists` or `field` | "Voided" (sup1) exists only in prose. No approval stamps anywhere. Publishing is Jeff's call |
| Trades Office (OneDrive, no git) | The job stage is the highest-numbered stage file; `owner-calls.md` is a table | Owner calls through `rows >= 15`; job stages through `exists` | Run-3 fixes and the new-jobs test have no done marker. The shared files in `_record/` carry `updated:` with no stamp, so R3 will raise fact-approval items |

I expect fan-ins to be rare in these 3, possibly none. R6 gets proved on the planted copy.

## 7. Files retired, kept or changed

| File | Verdict | Why |
|---|---|---|
| `STATUS.md` | **Generated.** It is rewritten by `gmsd board`, with a header saying it is generated | Brief item 1. The name stays because other files link to it |
| `dashboard.html` (old static) | **Delete** | The hand-authored board the live one replaced |
| `JEFF-TASKS.md` | **Archive** to `docs/archive/` | Last updated 2026-08-06. Replaced by the queue. Its checkbox toggling is a status typed by hand |
| `scripts/check-sync.js`, `.githooks/pre-commit`, `.github/workflows/check-sync.yml` | **Delete**. CI runs `npm test` instead | It guards hand-typed views that will no longer exist |
| `scripts/card-sync.mjs` and test | **Keep the folder discovery, cut the rest.** It stops writing cards and STATUS and stops pushing to `master` | Its discovery feeds a "folders with no graph" list. Its push to `master` breaks the brief |
| `scripts/nightly-board-update.mjs`, its PRD, `run-nightly.cmd` | **Delete**, and disable the 23:00 Task Scheduler job (outside the repo, so I need your yes) | Its morning step has a model rewriting cards from a digest, which is typed status |
| `projects/*.md` (31 cards) | **Kept as legacy data.** The 3 graphed projects' cards retire once their graph is live. The other 28 show on the board as "no graph yet", with the card's date, never with its typed state as current | Brief: starting data, not design |
| `server.js`, `live-dashboard.html` | **Extend**: `/api/board`, `/api/queue`, `/api/start`, `/api/answer` | Brief section 5 |
| `CLAUDE.md` | **Rewrite** | It routes to retired locations |
| Curriculum | One link-only row, `links:` with no units | Brief section 2 |

## 8. Evidence plan (fixed now, before any code)

- **Accuracy:** an independent script lists each unit's probe target and its raw disk fact, then
  diffs them against `/api/board`. I report units compared and mismatches.
- **Checker:** a throwaway copy with the 5 states planted, plus R6, gives a number caught of 5.
  The 3 real projects should produce 0 false refusals. A refusal that is true, such as an
  unstamped Trades Office fact, is not counted as false.
- **Hand-off:** one start prompt goes to a fresh agent with no other context, and it must name
  the right unit without asking a question.
- **Queue:** every item has 1 to 3 answers, each with one code action, checked by the test.
- **`npm test`:** happy and failure paths for the parser, probes, checker and board builder.

## 9. Frozen details (added 2026-10-15 22:00 MDT, before fan-out; Jeff said "keep going")

- **Paths.** Relative to `root`, or absolute (`C:/...`), so one project may span two repos.
  Forward slashes. In `done_when` and `active_when`, wrap any path containing a space in
  backticks. Lists (`waits_on`, `reads`, `writes`, `facts`, `start_reads`) are comma-separated;
  backticks are optional there.
- **`done_when: none`** means no disk marker exists. Status is `unknown` ("no disk marker"),
  and the unit becomes a gap item. This is honest, not a failure of the graph.
- **`active_when: <probe>`** (optional) marks work in flight that GMSD did not start, for
  example `branch feature/01-founder-recall`. When it is true and the unit is not done, the
  status is `running` and the owner is "unknown (started outside GMSD)".
- **Extra probes.** `branch <name>`: the branch exists in `root`'s git repo. `absent <path>`:
  the path does not exist. `contains <path> <text>`: the file contains the text (put the
  text in backticks).
- **Return file.** A heading `## Missing facts` followed by `- ` items. The words `none` or
  `(none)`, or no items at all, count as empty. If the heading is missing, the list is empty.
- **Unit gate item.** Raised when the unit has a `gate`, its `returns` file exists, and its
  `done_when` is false.
- **Order.** Units appear in `graph.md` in the order the work is meant to run. That order is
  the tiebreak for next up.
- **The Control** uses slug `the-control`. Its root is `C:/GitHub/the-control-icm`, and it uses
  absolute paths into `C:/GitHub/the-control`.
