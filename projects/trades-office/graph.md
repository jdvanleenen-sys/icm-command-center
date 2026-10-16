---
project: Trades Office
root: C:/Users/JeffvanLeenen/OneDrive - fifthaveproperties.com/Jeff-HQ/10 Ventures/trades-office
folder: 10 Ventures/trades-office
links: []
---

## owner-calls
title: Owner calls, 15 to 20 owners, logged one row per call; rule is 6 or more of 15 pick the same pain with a dated cost
reads: owner-call-sheet.html, owner-call-sheet.pdf, owner-calls.md, bottleneck-map.md, C:/Users/JeffvanLeenen/OneDrive - fifthaveproperties.com/Jeff-HQ/10 Ventures/_business-plan/doctrine.md
writes: owner-calls.md
facts: C:/Users/JeffvanLeenen/OneDrive - fifthaveproperties.com/Jeff-HQ/10 Ventures/_business-plan/doctrine.md
done_when: rows owner-calls.md >= 15
start_reads: CLAUDE.md, owner-calls.md, owner-call-sheet.html, C:/Users/JeffvanLeenen/OneDrive - fifthaveproperties.com/Jeff-HQ/10 Ventures/_business-plan/doctrine.md
stop_at: one row added to the owner-calls.md table for each call Jeff reports, the same day, with no real name unless the owner agreed to be recorded; the tally is read from the Picked and Last time, cost columns, never typed; no other file changed

## run3-choices
title: Choose how run 3's fixes are made: (1) the action rule, by the starter's agent instructions in C:/GitHub/agent-workspace-starter or by a script that checks each reply; (3) item 8 at apprentice, a proposed decision counts or it always fails; (4) rows 1, 3 and 6 of critical-list.md, a source that differs from the signed scope fails item 1, a date inside the signed window agrees, and whether all 4 constraints are required and what "power" means
reads: tests/stage-1/results-run-3-2026-10-06.md, office/desks/30-scheduler/critical-list.md
writes: none
done_when: answered trades-office/run3-choices/gate
gate: Jeff makes the 3 choices
start_reads: tests/stage-1/results-run-3-2026-10-06.md
stop_at: Jeff's choices are recorded in GMSD; nothing in the project changes

## run3-fixes
title: Fix what run 3 showed: the action rule (fix 1), empty packet sections (fix 2), item 8 at apprentice (fix 3; the keeper.md and ladder.md log half is already fixed), the unclear scheduler rules (fix 4)
waits_on: run3-choices
reads: tests/stage-1/results-run-3-2026-10-06.md, tests/stage-1/answer-key-run-3.md, the-tool.md, office/
writes: office/_record/keeper.md, office/_record/ladder.md, office/desks/30-scheduler/CONTEXT.md, office/desks/30-scheduler/critical-list.md, office/decisions/CONTEXT.md, office/_templates/stages/40-JOB-PACKET.md, office/_templates/decision.md, the-tool.md, C:/GitHub/agent-workspace-starter/
facts: the-tool.md, office/_record/keeper.md, office/_record/ladder.md
done_when: all contains office/_templates/stages/40-JOB-PACKET.md `not in the files`; lacks the-tool.md `4 scheduler rules are unclear`
start_reads: CLAUDE.md, CONTEXT.md, the-tool.md, office/CLAUDE.md, tests/stage-1/results-run-3-2026-10-06.md, tests/stage-1/answer-key-run-3.md
stop_at: fixes 1 to 4 under "What to fix before stage 2" in results-run-3-2026-10-06.md made the way Jeff chose in run3-choices (his answer is in this prompt); fix 1 goes in C:/GitHub/agent-workspace-starter only if he chose the starter's instructions or the script, on its current local branch, not pushed; the-tool.md section 6 updated to match; each change listed in the reply with file and line; no test run, no script run, and no new jobs written

## new-jobs-test
title: Verdict test on 3 new made-up jobs the fixes were not fitted to, key written first by an agent that read only office/
waits_on: run3-fixes
reads: the-tool.md, office/, tests/CONTEXT.md, tests/stage-1/run-3/how-it-was-run.py.txt, tests/stage-1/results-run-3-2026-10-06.md
writes: office/jobs/, office/sources/, tests/stage-1/answer-key-run-4.md, tests/stage-1/run-4/, tests/stage-1/results-run-4-YYYY-MM-DD.md, C:/GitHub/agent-workspace-starter/data/trades-office/
facts: the-tool.md, office/_record/keeper.md, office/_record/ladder.md, office/_record/rule-of-4.md
done_when: none
start_reads: CLAUDE.md, the-tool.md, tests/CONTEXT.md, office/CLAUDE.md, office/jobs/CONTEXT.md, office/sources/CONTEXT.md, tests/stage-1/results-run-3-2026-10-06.md, tests/stage-1/run-3/how-it-was-run.py.txt
stop_at: 3 new made-up job folders and their source entries written; answer-key-run-4.md filed by a separate agent that read only office/, before the tasks are queued; 3 rounds per job through the starter's worker unchanged; replies saved as returned in run-4/; results-run-4-<date>.md written per tests/CONTEXT.md rule 3 (observed, inferred, not shown), with a second agent's read for unsupported claims; no office rule changed after the key is filed; no person's read claimed

## real-jobs-audit
title: Audit 10 real past jobs at 1 business (past-jobs step of the ladder), with that owner's written permission; real files stay off OneDrive
waits_on: owner-calls, new-jobs-test
reads: the-tool.md, office/_record/ladder.md, office/, tests/CONTEXT.md, owner-calls.md
writes: C:/ClientData/trades-office-audit/, tests/stage-2/
facts: the-tool.md, office/_record/keeper.md, office/_record/ladder.md, office/_record/rule-of-4.md, C:/Users/JeffvanLeenen/OneDrive - fifthaveproperties.com/Jeff-HQ/10 Ventures/_business-plan/doctrine.md
done_when: none
gate: Jeff names the business and confirms its owner gave written permission
start_reads: CLAUDE.md, CONTEXT.md, the-tool.md, office/_record/ladder.md, tests/CONTEXT.md, owner-calls.md
stop_at: stop before touching any real file if the business and the owner's written permission are not named in the start prompt; otherwise the office copy and the real job material only under C:/ClientData/trades-office-audit/, packets built in each job's shadow/ folder and compared with the person's, and a write-up in tests/stage-2/ with no names, numbers or amounts; nothing promoted

## unready-pain
title: Decide whether "jobs that start unready" is its own pain in the doctrine or stays inside "scattered job details"
reads: bottleneck-map.md, handoff-2026-10-06.md, C:/Users/JeffvanLeenen/OneDrive - fifthaveproperties.com/Jeff-HQ/10 Ventures/_business-plan/doctrine.md
writes: C:/Users/JeffvanLeenen/OneDrive - fifthaveproperties.com/Jeff-HQ/10 Ventures/_business-plan/doctrine.md, bottleneck-map.md
facts: C:/Users/JeffvanLeenen/OneDrive - fifthaveproperties.com/Jeff-HQ/10 Ventures/_business-plan/doctrine.md
done_when: answered trades-office/unready-pain/gate
gate: Jeff picks: a 7th pain in the doctrine, or kept inside scattered job details
start_reads: CLAUDE.md, bottleneck-map.md, handoff-2026-10-06.md, C:/Users/JeffvanLeenen/OneDrive - fifthaveproperties.com/Jeff-HQ/10 Ventures/_business-plan/doctrine.md
stop_at: Jeff's answer written into the doctrine's pain list (if a 7th pain) or into bottleneck-map.md (if it stays inside), with his name and the date; the call sheet is not changed in this unit

## to-set-numbers
title: Set the 3 numbers marked "to set" in done-for-one-fix.md (dated examples needed, days unprompted, whether 1 week of their person running it is enough)
reads: done-for-one-fix.md, handoff-2026-10-06.md
writes: done-for-one-fix.md
done_when: answered trades-office/to-set-numbers/gate
gate: Jeff sets the 3 numbers
start_reads: CLAUDE.md, done-for-one-fix.md
stop_at: the 3 "to set" marks in done-for-one-fix.md replaced with Jeff's numbers and his name and date, and the "Not settled" section updated; no other file changed
