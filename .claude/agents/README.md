# db-astro-suite — Agent System (Claude Code)

This directory contains the Claude Code subagents for the `db-astro-suite` monorepo.
Agents orchestrate multi-step development workflows — planning, implementing, reviewing, testing, and opening PRs — without you having to manage the individual steps.

> A parallel set of agents for GitHub Copilot lives in `.github/agents/`. The two are kept in sync but operate independently.

---

## How to Invoke an Agent

In Claude Code, there is **no `@mention` syntax**. You have three ways to start an agent:

1. **Natural language** — describe the task; the main agent reads each subagent's `description:` field and routes automatically when it matches:
   ```
   Add a magnitude filter to the DSO search results
   ```
2. **Name the agent in prose** — explicit override:
   ```
   Use the feature-agent to add a magnitude filter to the DSO search results
   ```
3. **`/agents` menu** — type `/agents`, pick a project agent from the list.

For PR feedback:

```
Use the feature-agent — PR #42 has feedback to address
```

---

## The Feature Agent

`feature-agent` is the primary entry point. Use it for:

- **New features** — plans, implements, reviews, tests, and opens a PR in one pipeline
- **PR feedback** — ingests human review comments from GitHub and fixes them on the existing branch

### New Feature Flow

1. Agent discusses the feature with you naturally — no fixed question list.
2. Produces a written plan — you approve before anything runs.
3. Phase 0b — asks logistics: base branch, feature branch name, execution environment (Foreground vs Background isolated worktree), and (Foreground only) Interactive vs Automated execution mode.
4. Phase 0.5 — either creates the feature branch in the current working tree, or calls `EnterWorktree` to spin up an isolated worktree under `.claude/worktrees/<feature-branch>` branched from `origin/<default-branch>`.
5. Invokes developer agent(s) via the Agent tool → reviewer → fix cycle (max 2) → E2E tester → PR creation.
6. Delivers a Done Report with PR URL.

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

In **Background (isolated worktree)** mode, execution defaults to Automated and runs end-to-end inside the worktree. Use this when you want the agent to handle the whole pipeline without interrupting your current working tree.

---

### PR Feedback Flow

Invoke with:

```
Use the feature-agent — PR #42 has feedback to address
```

The agent asks two questions upfront: the PR number (if not already in your prompt) and the execution mode. Then it:

1. Reads PR body, review comments, and changed files from GitHub via `gh` CLI.
2. Proposes a specific fix for each comment — **waits for your approval before writing any code** (applies in both modes).
3. Routes each approved fix to the correct developer agent(s) via the Agent tool.
4. **Interactive**: stages all fixes → shows a diff checkpoint → waits for your confirmation → commits + pushes.
5. **Automated**: commits and pushes immediately without pausing.
6. Replies to each comment thread on GitHub with the commit SHA and a one-line explanation.
7. Appends a `## Feedback Round N` section to the PR description (never replaces it).

---

## Agent Roster

| Agent              | Purpose                                                      | Invoke directly when…                                 |
| ------------------ | ------------------------------------------------------------ | ----------------------------------------------------- |
| `feature-agent`    | Orchestrates new features and PR feedback                    | You want a full pipeline, not just one step           |
| `frontend-dev`     | Angular v17+ implementation (hub, astrogram, starwizz, libs) | You want to implement a frontend-only change yourself |
| `backend-dev`      | Node.js ESM / Fastify and Go implementation                  | You want to implement a backend-only change yourself  |
| `infra-engineer`   | CI/CD pipelines, Dockerfile, deploy scripts                  | You need pipeline changes only                        |
| `lead-pr-reviewer` | Read-only staff-level code review                            | You want a review without running the full pipeline   |
| `e2e-tester`       | Playwright E2E — authoring and bug classification            | You need tests written or a failure investigated      |

---

## The Skill System

Each agent loads one or more **skills** at the start of a task. Skills live in `.claude/skills/<name>/SKILL.md` and contain the detailed procedures, templates, and rule catalogues. Agents are lightweight — skills are where all the domain knowledge lives.

| Skill                 | Loaded by          | What it defines                                                                  |
| --------------------- | ------------------ | -------------------------------------------------------------------------------- |
| `angular-component`   | `frontend-dev`     | Angular component/store/service workflow, signals, OnPush, testing               |
| `backend-api`         | `backend-dev`      | Node.js ESM route/service/model workflow, Go feature workflow, error pattern     |
| `pipeline-ops`        | `infra-engineer`   | CI/CD audit checklist, Dockerfile rules, deploy verification                     |
| `playwright-e2e`      | `e2e-tester`       | POM pattern, locator rules, visual regression, bug classification                |
| `pr-review-checklist` | `lead-pr-reviewer` | SOLID, anti-patterns, naming conventions, test integrity, DoD checklist          |
| `create-pr`           | `feature-agent`    | Branch push, structured PR description template, `gh pr create`                  |
| `pr-feedback`         | `feature-agent`    | Ingest PR comments, route to agents, stage/checkpoint/commit/push, reply threads |

You can also invoke a skill directly via the Skill tool (`/skills`).

---

## Inter-Agent Delegation

Claude Code has no `handoffs:` frontmatter and no button-based handoffs. Agents recommend the next step in plain text at the end of their final message; the **`feature-agent` orchestrator** then invokes the recommended next agent via the **Agent tool** (`subagent_type=<agent-name>`).

If you are invoking a single dev agent directly (no orchestrator), its closing recommendation tells you what to do next — type "use the e2e-tester to ..." (or whichever agent) to continue the chain.

---

## Prerequisites

- `git` configured with remote `origin` pointing to this repository
- `gh` CLI authenticated (`gh auth login`) — used for PR creation, reading review comments, and replying to comment threads
- Claude Code installed and signed in to your Anthropic account
