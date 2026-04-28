# db-astro-suite — Agent System

This directory contains the AI agents for the `db-astro-suite` monorepo.
Agents orchestrate multi-step development workflows — planning, implementing, reviewing, testing, and opening PRs — without you having to manage the individual steps.

---

## How to Invoke an Agent

In VS Code with GitHub Copilot Chat open, type `@` followed by the agent name, then describe what you want:

```
@feature-agent Add a magnitude filter to the DSO search results (Angular, frontend only)
```

```
@feature-agent PR #42 has feedback to address
```

Each agent's `argument-hint` in the panel describes what to provide.

---

## The Feature Agent

`feature-agent` is the primary entry point. Use it for:

- **New features** — plans, implements, reviews, tests, and opens a PR in one pipeline
- **PR feedback** — ingests human review comments from GitHub and fixes them on the existing branch

### New Feature Flow

1. Agent asks 8 planning questions (stack, branch name, execution mode, etc.) in a single message
2. Produces a written plan — you approve before anything runs
3. Creates the feature branch
4. Invokes developer agent(s) → reviewer → fix cycle (max 2) → E2E tester → PR creation
5. Delivers a Done Report with PR URL

#### Execution Modes

| Mode            | Behaviour                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| **Interactive** | Pauses after each phase. Stages changes for you to review. Nothing is committed or pushed until you confirm. |
| **Automated**   | Runs all phases end-to-end without stopping. Only pauses on genuine blockers (e.g. second review failure).   |

**Interactive checkpoints:**

| Checkpoint                     | What it shows                                                 | What you can do                                                                           |
| ------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| After Phase 1 (Implementation) | Files changed, summary. Changes staged via `git add -A`.      | Run `git diff --staged` locally to review. Reply `continue` to commit, or describe a fix. |
| After Phase 2 (Review)         | Verdict, review cycles, issues resolved. Review fixes staged. | Run `git diff --staged`. Reply `continue` to commit, or `skip e2e`.                       |
| After Phase 3 (E2E)            | Tests written, bugs found. E2E changes staged.                | Run `git diff --staged`. Reply `continue` to commit, push, and open the PR.               |

Until you confirm at the Phase 3 checkpoint, **nothing is committed or pushed to GitHub**.

---

### PR Feedback Flow

Invoke with:

```
@feature-agent PR #42 has feedback to address
```

The agent asks two questions upfront: the PR number (if not already in your prompt) and the execution mode. Then it:

1. Reads PR body, review comments, and changed files from GitHub via `gh` CLI
2. Proposes a specific fix for each comment — **waits for your approval before writing any code** (applies in both modes)
3. Routes each approved fix to the correct developer agent(s)
4. **Interactive**: stages all fixes → shows a diff checkpoint → waits for your confirmation → commits + pushes
5. **Automated**: commits and pushes immediately without pausing
6. Replies to each comment thread on GitHub with the commit SHA and a one-line explanation
7. Appends a `## Feedback Round N` section to the PR description (never replaces it)

---

## Agent Roster

| Agent                | Purpose                                                      | Invoke directly when…                                 |
| -------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| `feature-agent`      | Orchestrates new features and PR feedback                    | You want a full pipeline, not just one step           |
| `frontend-dev`       | Angular v17+ implementation (hub, astrogram, starwizz, libs) | You want to implement a frontend-only change yourself |
| `backend-dev`        | Node.js ESM / Fastify and Go implementation                  | You want to implement a backend-only change yourself  |
| `infra-engineer`     | CI/CD pipelines, Dockerfile, deploy scripts                  | You need pipeline changes only                        |
| `lead-code-reviewer` | Read-only staff-level code review                            | You want a review without running the full pipeline   |
| `e2e-tester`         | Playwright E2E — authoring and bug classification            | You need tests written or a failure investigated      |

---

## The Skill System

Each agent loads one or more **skills** at the start of a task. Skills live in `.github/skills/` and contain the detailed procedures, templates, and rule catalogues. Agents are lightweight — skills are where all the domain knowledge lives.

| Skill                 | Loaded by            | What it defines                                                                  |
| --------------------- | -------------------- | -------------------------------------------------------------------------------- |
| `angular-component`   | `frontend-dev`       | Angular component/store/service workflow, signals, OnPush, testing               |
| `backend-api`         | `backend-dev`        | Node.js ESM route/service/model workflow, Go feature workflow, error pattern     |
| `pipeline-ops`        | `infra-engineer`     | CI/CD audit checklist, Dockerfile rules, deploy verification                     |
| `playwright-e2e`      | `e2e-tester`         | POM pattern, locator rules, visual regression, bug classification                |
| `pr-review-checklist` | `lead-code-reviewer` | SOLID, anti-patterns, naming conventions, test integrity, DoD checklist          |
| `create-pr`           | `feature-agent`      | Branch push, structured PR description template, `gh pr create`                  |
| `pr-feedback`         | `feature-agent`      | Ingest PR comments, route to agents, stage/checkpoint/commit/push, reply threads |

Skills are passive instruction files — agents load them via `read_file` when needed. You never invoke a skill directly.

---

## Prerequisites

- `git` configured with remote `origin` pointing to this repository
- VS Code with the GitHub Copilot Chat extension (agent mode enabled)
- GitHub account connected in VS Code (used by the GitHub PR extension tools for PR creation)
