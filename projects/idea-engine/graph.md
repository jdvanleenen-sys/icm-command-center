---
project: Idea Engine
root: C:/GitHub/idea-engine-van-leenen
links: []
---

## 00-contain-define
title: Contain, then make the existing build safe to use
reads: _shared/PRD.md, _shared/decisions.md, app/, config/bars.yaml
writes: stages/00_contain-define/output/, app/, config/bars.yaml
facts: _shared/PRD.md
done_when: stamped stages/00_contain-define/output/done.md
active_when: branch feature/00-contain-define
returns: stages/00_contain-define/output/done.md
gate: Jeff signs approved_by in done.md; stage 01 starts after that
start_reads: CONTEXT.md, stages/00_contain-define/CONTEXT.md, _shared/PRD.md, _shared/decisions.md, _shared/coding-rules.md, _templates/stage-done.md
stop_at: output/done.md written from _templates/stage-done.md with approved_by blank, work pushed on feature/00-contain-define, not merged to main; git history rewrite planned with owner and date, not run

## 01-founder-recall
title: Founder idea recall and case inventory
waits_on: 00-contain-define
reads: _shared/PRD.md, _shared/decisions.md, stages/00_contain-define/output/done.md
writes: stages/01_founder-recall/output/, app/
facts: _shared/PRD.md
done_when: stamped stages/01_founder-recall/output/done.md
active_when: branch feature/01-founder-recall
returns: stages/01_founder-recall/output/done.md
gate: Jeff signs approved_by in done.md; that decides whether stage 02 starts and which retrieval methods go forward
start_reads: CONTEXT.md, stages/01_founder-recall/CONTEXT.md, _shared/PRD.md, stages/00_contain-define/output/done.md, _shared/coding-rules.md, _templates/stage-done.md
stop_at: output/done.md written from _templates/stage-done.md (problems found, per-method counts and costs, p95 latency, case inventory counts) with approved_by blank, work pushed on feature/01-founder-recall, not merged to main

## 01x-second-host
title: Second AI host technical smoke test (runs alongside 01 and 02, blocks neither)
reads: _shared/PRD.md, _shared/decisions.md, _shared/open-questions.md
writes: stages/01x_second-host/output/
facts: _shared/PRD.md
done_when: stamped stages/01x_second-host/output/done.md
returns: stages/01x_second-host/output/done.md
gate: Jeff signs approved_by in done.md
start_reads: CONTEXT.md, stages/01x_second-host/CONTEXT.md, _shared/PRD.md, _shared/open-questions.md, _shared/coding-rules.md, _templates/stage-done.md
stop_at: stop and ask Jeff if open question 10 (which host) is unanswered; otherwise output/host-matrix.md and output/done.md written with approved_by blank, work pushed on a feature branch, not merged to main

## 02-founder-cases
title: Founder cases and "what have I tried?" case recall
waits_on: 01-founder-recall
reads: _shared/PRD.md, _shared/decisions.md, stages/01_founder-recall/output/done.md
writes: stages/02_founder-cases/output/, app/
facts: _shared/PRD.md
done_when: stamped stages/02_founder-cases/output/done.md
returns: stages/02_founder-cases/output/done.md
gate: Jeff signs approved_by in done.md, including the continue, narrow or stop decision on the Case Library
start_reads: CONTEXT.md, stages/02_founder-cases/CONTEXT.md, _shared/PRD.md, stages/01_founder-recall/output/done.md, _shared/coding-rules.md, _templates/stage-done.md
stop_at: output/done.md written from _templates/stage-done.md with approved_by blank and the Case Library continue/narrow/stop question left for Jeff, work pushed on feature/02-founder-cases, not merged to main

## 03a-benchmark
title: Independent retrieval benchmark
waits_on: 02-founder-cases
reads: _shared/PRD.md, _shared/decisions.md, stages/02_founder-cases/output/done.md, stages/00_contain-define/output/done.md
writes: stages/03a_benchmark/output/, app/
facts: _shared/PRD.md
done_when: stamped stages/03a_benchmark/output/done.md
returns: stages/03a_benchmark/output/done.md
gate: a person signs approved_by in done.md
start_reads: CONTEXT.md, stages/03a_benchmark/CONTEXT.md, _shared/PRD.md, stages/02_founder-cases/output/done.md, _shared/coding-rules.md, _templates/stage-done.md
stop_at: stop and ask Jeff if any prerequisite in the stage CONTEXT.md is unmet (including the stage 00 history rewrite); otherwise output/done.md written with approved_by blank, work pushed on feature/03a-benchmark, not merged to main

## 03b-outside-feasibility
title: Outside-user import and product feasibility
waits_on: 03a-benchmark
reads: _shared/PRD.md, _shared/decisions.md, stages/03a_benchmark/output/done.md
writes: stages/03b_outside-feasibility/output/, app/
facts: _shared/PRD.md
done_when: stamped stages/03b_outside-feasibility/output/done.md
returns: stages/03b_outside-feasibility/output/done.md
gate: a person signs approved_by in done.md
start_reads: CONTEXT.md, stages/03b_outside-feasibility/CONTEXT.md, _shared/PRD.md, stages/03a_benchmark/output/done.md, _shared/coding-rules.md, _templates/stage-done.md
stop_at: stop and ask Jeff if any prerequisite in the stage CONTEXT.md is unmet (3a prerequisites, consent, isolation, deletion, privacy and legal review); otherwise output/done.md written with approved_by blank, work pushed on feature/03b-outside-feasibility, not merged to main

## 04-cross-host
title: Real cross-host use
waits_on: 03b-outside-feasibility
reads: _shared/PRD.md, _shared/decisions.md, stages/01x_second-host/output/host-matrix.md, stages/03b_outside-feasibility/output/done.md
writes: stages/04_cross-host/output/, app/
facts: _shared/PRD.md
done_when: stamped stages/04_cross-host/output/done.md
returns: stages/04_cross-host/output/done.md
gate: a person signs approved_by in done.md
start_reads: CONTEXT.md, stages/04_cross-host/CONTEXT.md, _shared/PRD.md, stages/03b_outside-feasibility/output/done.md, _shared/coding-rules.md, _templates/stage-done.md
stop_at: output/done.md and the host capability matrix written with approved_by blank, work pushed on feature/04-cross-host, not merged to main

## 05-longitudinal
title: Longitudinal value of the idea-to-attempt-to-case loop
waits_on: 04-cross-host
reads: _shared/PRD.md, _shared/decisions.md, stages/04_cross-host/output/done.md
writes: stages/05_longitudinal/output/, app/
facts: _shared/PRD.md
done_when: stamped stages/05_longitudinal/output/done.md
returns: stages/05_longitudinal/output/done.md
gate: a person signs approved_by in done.md
start_reads: CONTEXT.md, stages/05_longitudinal/CONTEXT.md, _shared/PRD.md, stages/04_cross-host/output/done.md, _shared/coding-rules.md, _templates/stage-done.md
stop_at: output/done.md written with approved_by blank, work pushed on feature/05-longitudinal, not merged to main

## 06-extensions
title: Extensions: ICM workspace drafts and the spark
waits_on: 05-longitudinal
reads: _shared/PRD.md, _shared/decisions.md, stages/05_longitudinal/output/done.md
writes: stages/06_extensions/output/, app/
facts: _shared/PRD.md
done_when: stamped stages/06_extensions/output/done.md
returns: stages/06_extensions/output/done.md
gate: a person signs approved_by in done.md
start_reads: CONTEXT.md, stages/06_extensions/CONTEXT.md, _shared/PRD.md, stages/05_longitudinal/output/done.md, _shared/coding-rules.md, _templates/stage-done.md
stop_at: output/done.md (one section per extension) written with approved_by blank, work pushed on feature/06-extensions, not merged to main
