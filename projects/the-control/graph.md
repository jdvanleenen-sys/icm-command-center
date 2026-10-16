---
project: The Control harness
root: C:/GitHub/the-control-icm
links: []
---

## plan-reviews
title: Plan, three design reviews and one outside review by Perplexity
reads: PLAN.md, C:/GitHub/the-control/EXPERIMENT.md, C:/GitHub/the-control/PREREGISTRATION.md, C:/GitHub/the-control/MARKING.md
writes: PLAN.md, DESIGN-LOG.md, reviews/
done_when: contains DESIGN-LOG.md `## Round 4: outside review by Perplexity`
start_reads: README.md, PLAN.md, DESIGN-LOG.md
stop_at: DESIGN-LOG.md has a round 4 section with every note accepted, changed or refused; PLAN.md updated to match

## new-questions
title: New questions written, key-checked, de-duplicated; key-fact patterns committed
waits_on: plan-reviews
reads: PLAN.md, C:/GitHub/the-control/questions.md, C:/GitHub/the-control/reference/
writes: questions-new.md, generator/new/, tools/key-facts-sets.mjs, tools/key-facts-sets.fixtures.mjs, verify/key-facts-sets.test.mjs
done_when: all exists questions-new.md; exists generator/new/key-check.md; exists verify/key-facts-sets.test.mjs
start_reads: PLAN.md, generator/question-prompt.md, generator/key-check-prompt.md
stop_at: questions-new.md, generator/new/key-check.md and the key-fact pattern test committed; node verify/key-facts-sets.test.mjs passes

## brief-practice
title: Practice sets copied in; the builder's brief committed and fingerprinted
waits_on: new-questions
reads: PLAN.md
writes: builder/BRIEF.md, builder/fingerprints.txt, builder/template/, practice/
done_when: all exists builder/BRIEF.md; exists builder/fingerprints.txt; exists practice/boat-lend/questions.md; exists practice/garden-makerspace/questions.md; exists practice/hall-pool/questions.md
start_reads: PLAN.md, builder/BRIEF.md
stop_at: brief, template and three practice sets committed with their fingerprints in builder/fingerprints.txt

## harness-analysis
title: Harness changes and the analysis script, tested on fixtures
waits_on: brief-practice
reads: PLAN.md, lib/, C:/GitHub/the-control/lib/
writes: lib/sup.mjs, tools/sup-run.mjs, tools/sup-schedule.mjs, verify/sup-verdict.mjs, verify/sup-verdict.test.mjs, verify/sup-selftest.mjs
done_when: all exists verify/sup-verdict.test.mjs; exists verify/sup-selftest.mjs
start_reads: PLAN.md, DESIGN-LOG.md
stop_at: node verify/sup-verdict.test.mjs and node verify/sup-selftest.mjs pass; corrections found by the tests logged in DESIGN-LOG.md

## icm-build
title: ICM built and revised over up to five practice rounds, each logged
waits_on: harness-analysis
reads: builder/BRIEF.md, builder/template/, practice/
writes: arms/icm/, builder/ROUNDS.md, builder/DECISIONS.md, builder/practice-logs/
done_when: all exists builder/ROUNDS.md; exists arms/icm/CLAUDE.md
start_reads: builder/BRIEF.md, builder/ROUNDS.md, builder/DECISIONS.md
stop_at: the round's entry written in builder/ROUNDS.md and its logs committed; no more than five rounds in total

## live-list-checks
title: Live document list generated, icm-eager made by script, script checks, minimum text and text prediction published
waits_on: icm-build
reads: arms/icm/, reference/, tools/make-map.mjs, verify/sup-icm-check.mjs
writes: `arms/icm/01 answer/documents.md`, builder/icm-check.txt, PLAN.md
done_when: all exists `arms/icm/01 answer/documents.md`; contains builder/icm-check.txt `minimum text per question`; contains PLAN.md `after the minimum was published`
start_reads: PLAN.md, builder/icm-check.txt
stop_at: builder/icm-check.txt shows every check PASS and the minimum text; the text prediction written into PLAN.md

## gate
title: The gate: cold walk, walk-test list, fidelity check by a fresh auditor; fixes from the closed list only
waits_on: live-list-checks
reads: arms/icm/, builder/BRIEF.md, builder/DECISIONS.md, builder/ROUNDS.md
writes: builder/GATE-1.md, builder/GATE-2.md, builder/gate-1-logs/, builder/gate-2-logs/
done_when: contains builder/GATE-2.md `GATE: PASS`
start_reads: PLAN.md, DEVIATIONS.md, builder/GATE-1.md
stop_at: a GATE file ends in a GATE: PASS or GATE: FAIL line; a FAIL goes back to icm-build for one gate-fix round and is logged in DEVIATIONS.md

## freeze
title: Freeze: fingerprints of every arm, the questions and the analysis script
waits_on: gate
reads: arms/, questions-new.md, questions.md, questions-heldout.md, lib/, tools/, verify/
writes: FREEZE.md
done_when: exists FREEZE.md
start_reads: PLAN.md, FREEZE.md
stop_at: FREEZE.md committed before any schedule is drawn

## sealed-run
title: One sealed run, every session kept (sup1 void by usage limit; sup2 is the run)
waits_on: freeze
reads: FREEZE.md, tools/sup-schedule.mjs, tools/sup-run.mjs
writes: runs/sup2/schedule.json, runs/sup2/logs/, runs/sup2/logs.sha256, runs/sup2/manifest.json, runs/sup2/rows-coded.json, runs/sup2/run-printed.txt, runs/sup2/scan.md, runs/sup2/staged-after.json
done_when: all exists runs/sup2/logs.sha256; contains runs/sup2/scan.md `No faults found.`
start_reads: PLAN.md, DEVIATIONS.md, FREEZE.md
stop_at: runs/sup2/scan.md written and the run committed with the key kept back

## marking
title: Marking with the arms hidden (Claude Opus 5.5, Gemini), key-fact count, then the key revealed
waits_on: sealed-run
reads: MARKING.md, runs/sup2/rows-coded.json, verify/sup-mark.mjs
writes: runs/sup2/marking/, runs/sup2/marks-opus.csv, runs/sup2/marks-gemini.csv, runs/sup2/marking-key.csv, runs/sup2/key.json, runs/sup2/key-staged.json
done_when: all exists runs/sup2/marks-opus.csv; exists runs/sup2/marks-gemini.csv; exists runs/sup2/key.json
start_reads: MARKING.md, PLAN.md
stop_at: both markers' marks committed, then the key revealed in a separate commit

## results
title: Analysis script run once; results page written to its sentences
waits_on: marking
reads: runs/sup2/, verify/sup-results.mjs, verify/sup-verdict.mjs
writes: RESULTS.md, runs/sup2/verdicts.md, runs/sup2/figures.md, README.md, DEVIATIONS.md
done_when: all exists RESULTS.md; exists runs/sup2/verdicts.md
start_reads: PLAN.md, DEVIATIONS.md, runs/sup2/verdicts.md
stop_at: RESULTS.md and runs/sup2/verdicts.md committed; README.md front page carries the result

## publish
title: Whether to publish: Jeff's call (all of it or none, voided run included)
waits_on: results
reads: PLAN.md, PUBLISHING.md, README.md, RESULTS.md, DEVIATIONS.md
writes: PUBLISHING.md
done_when: approved PUBLISHING.md
returns: PUBLISHING.md
gate: Jeff decides whether to publish the supplement
start_reads: PLAN.md, PUBLISHING.md
stop_at: PUBLISHING.md lists what was taken out and the old-to-new commit ids; publishing itself waits for Jeff
