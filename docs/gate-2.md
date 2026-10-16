# GMSD v1, gate 2: evidence and residuals

Written 2026-10-15, 22:05 MDT, on `feature/gmsd-v1` (pushed; not merged). The checks are the
brief's section 4, fixed before any code. Every attempt was judged against them, never against the
previous attempt. Budget: 3 attempts.

## The checks

| Check (brief section 4) | Result | How it was measured |
|---|---|---|
| Accuracy on the 3 projects | **PASS: 29 of 29 units match, 0 mismatches** | An independent agent opened every probe target and derived each status itself (2nd run, after the last graph change; the 1st run was 28 of 28) |
| Checker: 5 planted bad states | **PASS: 5 of 5 caught** (and R6, 6 of 6) | `node evidence/plant.mjs`: a throwaway copy of GMSD and all 3 project roots; the copy matches the real board on 28 of 28 units before planting; the target unit passes the checker before every plant |
| Checker: no false refusals on the real projects | **PASS: 0 false out of 13 refusals** | The same independent audit checked each refusal's stated fact on disk; 0 refusals missed |
| Hand-off: a fresh agent starts without a question | **FAIL after 3 attempts**: right unit and concrete line-level first edits each time; questions went from 2 to 2 to 1 | `node evidence/handoff.mjs`; fresh agents with only the prompt, dry run |
| Queue: each item closes in one reply | **PASS: 12 of 12** | Independent audit, plus tests for each answer type |
| `npm test`, happy and failure paths | **PASS: 25 of 25** | Checker, board, queue, probes, parser, discovery, server. Removing any one of the 5 rules makes at least 1 test fail (mutation check) |

**Hand-off detail.** Attempt 1 found a real code bug (a relative graph path) and a graph bug
(run3-fixes hid 3 of your decisions). Both were fixed, and the decisions became a decision unit,
`run3-choices`. Attempt 2 found the decision unit missing a 4th choice. Attempt 3's one remaining
question is about the content of the answer: "a gap inside the signed scope is a hold", but which
critical item fails? That answer was simulated for the test, so the gap is in how the choice was
worded, not in what GMSD generated. The lesson: **a graph is only as good as the decision units
it names.** Code cannot check that a question covers every open choice.

## The board tonight

| Project | Done | Running | Waiting on you | Blocked | Unknown | Next up |
|---|---|---|---|---|---|---|
| Idea Engine (10) | 1 | 1 (01, started outside GMSD) | 1 (open question 10) | 7 | 0 | none |
| The Control (12) | 11 | 0 | 1 (publish) | 0 | 0 | none |
| Trades Office (7) | 0 | 0 | 3 (run3-choices, unready-pain, to-set-numbers) | 2 | 2 | none |

There are 12 queue items. No unit is ready today, because every project is waiting on you or on
work in flight. Run `npm run dashboard` from the worktree to see it live.

## Residuals (observed, not fixed)

1. **Merge friction.** Your 3 uncommitted files are still on `master` in `C:\GitHub\command-center`,
   untouched: `STATUS.md`, `projects/trades-office.md`, `projects/build-it-once.md`.
   `STATUS.md` is now generated, so your edit to it will conflict. The Trades Office graph was
   built from your uncommitted card.
2. **The 23:00 Task Scheduler job** still runs `scripts/run-nightly.cmd` on `master`. Tonight it
   will skip committing, because `STATUS.md` has uncommitted edits. After a merge the script is
   gone and the job will error, so disable it then.
3. **The dashboard now listens on 127.0.0.1 only,** because POSTs write state. If you opened it
   from your phone on the LAN, that stops working.
4. **Statuses that follow the rules but mislead** (the auditors' opinions, with evidence):
   - **the-control publish** asks whether to publish, but the repo is already public.
   - **Idea Engine 01** shows "running" off its branch, but its last commit was 2026-10-01. Its
     findings.md has 3 "Waiting on Jeff" rows that GMSD does not read.
   - **Trades Office owner-calls** shows blocked on the doctrine stamp; the real constraint is 0
     of 15 calls made.
   - **Fact approvals will lapse:** approving the-tool, keeper, ladder or doctrine now gets undone
     when run3-fixes or unready-pain edit them. Only rule-of-4.md would keep its approval.
   - **unready-pain** may already be answered in bottleneck-map.md (lines 55-60, with no name or
     date).
   - **Open question 10** needs Roelof as well as you; one reply from you closes the item.
5. **Decision units close on your answer.** For unready-pain and to-set-numbers, writing that
   answer into the doctrine or done-for-one-fix.md is not tracked as its own unit.
6. **Probes read the working tree.** Whatever branch is checked out in a project repo is what
   GMSD sees.
7. **28 projects have no graph.** They show by name and card date only.
8. **Graph authoring is by a chat, not by you,** and it is the weak link (see hand-off). Two
   graph writers' guesses are still open: Trades Office `real-jobs-audit` writes to
   `C:/ClientData/trades-office-audit/` and `tests/stage-2/`, and neither exists yet.
9. **Leftover from this run:** a git worktree at `C:\GitHub\command-center-gmsd`. Remove it after
   the merge with `git worktree remove`.
