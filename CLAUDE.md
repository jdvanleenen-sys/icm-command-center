# Command Center (GMSD)

The one board for every project Jeff has in flight. It is computed from disk on every request.
Nobody types a status here, Jeff included. This file points; it holds no status.

The plan that governs this repo is [GMSD-BRIEF.md](GMSD-BRIEF.md). The design (the `graph.md`
format, the probes, the checker rules, the queue item shape) is [docs/gmsd-design.md](docs/gmsd-design.md).

## Routing

| I want to... | Open or run |
|---|---|
| See every project, what is running, what waits on me | `npm run dashboard` (http://localhost:5757) |
| Regenerate the text board | `npm run board` (writes [STATUS.md](STATUS.md); never edit it by hand) |
| See what is waiting on me | the dashboard, or `npm run gmsd -- queue` |
| Answer a queue item | a button on the dashboard, or `npm run gmsd -- answer <id> <a/b/c> [text]` |
| Start the next unit of a project | "Start it" on the dashboard, or `npm run gmsd -- start <slug> <unit>`; paste the prompt into a new chat |
| Ask why a unit will not start | `npm run gmsd -- check <slug> <unit>` |
| See the board on my phone | the phone copy, a private claude.ai page: https://claude.ai/artifact/FCfATLveC6eJmJJmViKfqH (a still copy; refresh it below) |
| Refresh the phone copy and apply what I answered there | 1) ArtifactData `list` of collection `answers` on that URL, save the docs (with `docId`) to a JSON file; 2) `npm run gmsd -- phone-apply <file>`; 3) ArtifactData `update` each doc's `status` (and `reason`) from the result; 4) `npm run gmsd -- snapshot <file>` and publish that file to the same URL |
| Put a project on the graph | write `projects/<slug>/graph.md` (format in docs/gmsd-design.md sections 2 and 9) |
| The curriculum | its own board (`C:\GitHub\animation-build`, `npm run board`); GMSD shows it as one link row and never starts or gates a lesson |
| Know which URL/account/key I still need | `urls-and-accounts.md`, local only, never committed |

## Where things live

- `projects/<slug>/graph.md`: declared units of work. Structure only, never status.
- `projects/<slug>/converge/<unit>/`: `cross-read.md`, `differences.md`, `rulings.md` for a fan-in.
- `projects/*.md`: old hand-written cards, kept as data for projects with no graph yet. The board
  shows their name and date, never their typed state as current.
- `state/`: claims (who started what), approvals of shared facts (keyed by file hash), and
  Jeff's answers. Written only by GMSD's code.
- `gmsd/`: the code. `tests/`: `npm test`.

## Rules

1. GMSD reads project folders and never writes to them. A change a project needs becomes a start
   prompt for a chat working in that project.
2. GMSD never runs a unit's work. It refuses or allows a start and prints the prompt.
3. No status is typed. If a unit's state cannot be read from disk, it shows as unknown with the
   reason, and becomes a question for Jeff.
4. Code and state live in this repo, never in OneDrive. Work on feature branches; `master` changes
   only by merge after Jeff's gate.
5. No secrets in the repo.
