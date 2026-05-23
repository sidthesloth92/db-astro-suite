---
name: pr-feedback
description: "Workflow for addressing human review comments on an existing GitHub PR. Split into Part A (ingest and solution planning — runs before user approves the plan) and Part B (implementation, code review, E2E, and PR update — runs after approval with execution mode known). Covers ingesting PR context via gh CLI, routing fixes to developer agents, running lead-pr-reviewer and e2e-tester, committing fixes to the existing branch, replying to comment threads, and updating the PR description."
argument-hint: "Provide the PR number and execution mode (Automated or Interactive)."
---

# PR Feedback Workflow

## When to Use

- A human has reviewed an open PR and left review comments on GitHub
- `feature-agent` was invoked with a prompt like "PR #42 has feedback to address"
- Part A runs immediately after the PR number is known; Part B runs after the user approves the solution plan

---

## Part A — Ingest and Plan

> Run this before user approval. Do not invoke any developer agent during Part A.

### Step 1 — Ingest PR Context

Run all three commands and capture their output:

```sh
# Full PR details — title, body (contains feature context, plan, decisions), branch names
gh pr view <pr-number>

# All review comments left by the human reviewer
gh pr view <pr-number> --comments

# Changed files — used to detect stack and route to the correct developer agent
gh pr diff <pr-number> --name-only
```

From this output extract:

- **Feature description** — from the PR body `## Feature Context` section
- **Branch name** — from `gh pr view` (`head` field) — this is the branch to commit fixes to
- **Base branch** — from `gh pr view` (`base` field)
- **Review comments** — each comment body is a fix item
- **Stack** — from file paths in the diff (see routing table below)

### Step 2 — Detect Stack from File Paths

| Changed file path pattern                                      | Stack        | Agent(s) to invoke           |
| -------------------------------------------------------------- | ------------ | ---------------------------- |
| `hub/**`, `tools/astrogram/**`, `tools/starwizz/**`, `libs/**` | Frontend     | `frontend-dev`               |
| `tools/astrosolve/**`, `services/**`                           | Backend      | `backend-dev`                |
| `tools/astro-gen-go/**`                                        | Backend (Go) | `backend-dev`                |
| `.github/workflows/**`, `**/Dockerfile`                        | Infra        | `infra-engineer`             |
| Mixed                                                          | Multiple     | route to each relevant agent |

### Step 2.5 — Propose Solutions (end of Part A)

Before invoking any developer agent, produce a solution proposal for every review comment and present them all in a single message:

```
## Feedback Solution Plan — PR #<number>

---

**Comment 1** (by <author>, on `<file>:<line>`):
> <quoted comment text>

**Proposed fix**: <one-paragraph description — specific enough to act on: which file, what changes, why this approach>

---

**Comment 2** (by <author>, on `<file>:<line>`):
> <quoted comment text>

**Proposed fix**: <description>

---

Does this plan look right? Reply 'approved' to proceed, correct any item inline, or tell me to skip a comment entirely.
```

**This is the end of Part A.** Return control to `feature-agent`, which will wait for explicit user approval and then ask for execution mode before starting Part B.

If the user corrects an item: update the proposed fix for that comment, re-show only the corrected entry, and ask for final confirmation before proceeding.

---

## Part B — Implementation, Review, E2E, and PR Update

> Execution mode (Automated or Interactive) is passed in by `feature-agent` before Part B begins. All steps below apply the chosen mode.

### Step 2.7 — Switch to the PR Branch

Before any files are written, ensure you are on the correct branch:

```sh
git checkout <branch-name>   # branch-name extracted from gh pr view in Step 1
git pull origin <branch-name>
```

If `git checkout` fails (e.g. uncommitted local changes), pause and report the conflict to the user before proceeding.

### Step 3 — Hand Off to Developer Agent(s)

Invoke the correct agent(s) via the Agent tool with this context package:

1. **Feature context** — the `## Feature Context` section from the PR description
2. **Approved fix plan** — the approved solution description per comment (from Step 2.5), as a numbered list
3. **Branch name** — must commit all fixes to the existing branch, NOT create a new one
4. **Instruction** — write files only; do not run any git commands

If multiple stacks are involved, route to each agent in this order:
`backend-dev` → `frontend-dev` → `infra-engineer`

### Step 3.5 — Code Review

Invoke `lead-pr-reviewer` with:

- All files changed during Step 3
- The feature description and approved fix plan for context

Capture the verdict:

- **APPROVED** → proceed to Step 4
- **CHANGES REQUESTED** → invoke the same agent(s) from Step 3 with the reviewer's full MUST FIX list → re-invoke `lead-pr-reviewer`
  - **APPROVED on re-review** → proceed to Step 4
  - **CHANGES REQUESTED (second time)** → pause, list the outstanding blockers, and ask the user how to proceed. Never loop more than twice without human input.

### Step 4 — Post-Implementation Checkpoint / Commit

Once all developer agents and the review cycle are complete:

1. Run `git add -A` to stage all changes (developer fixes + any review fixes)

**Interactive mode** — pause and show:

```
## Implementation Complete — Review Before Committing

**PR**: #<number>
**Comments addressed**: <count>
**Files changed:**
- <file> — <fix applied>

**Code review**: APPROVED (after <N> cycle(s))

Changes are staged but NOT committed or pushed. Run `git diff --staged` to review.
Reply 'continue' to commit and proceed to E2E tests, or describe anything to adjust first.
```

If the user provides feedback: run `git restore --staged .`, re-invoke the relevant agent(s) with the feedback, re-stage, and re-show this checkpoint.

On 'continue':

2. `git commit -m "fix: address PR #<number> review feedback"`

**Automated mode**: commit immediately after the review cycle completes, without pausing.

### Step 5 — E2E Testing

Invoke `e2e-tester` (via the Agent tool) with:

- The feature description
- All files changed in Step 3
- The user flows introduced or modified by the addressed comments

### Step 6 — Pre-Push Gate / Commit and Push

1. Run `git add -A` to stage all E2E changes

**Interactive mode** — pause and show:

```
## E2E Complete — Final Gate Before Push

**PR**: #<number>
**Tests written/updated**: <list>
**Bugs found**: <list or "none">

E2E changes are staged but NOT committed or pushed. Run `git diff --staged` to review.
Reply 'continue' to commit, push, and update the PR — or describe anything to fix first.
```

On 'continue':

2. `git commit -m "test: add/update e2e coverage for PR #<number> feedback"`
3. `git push` (to the existing remote branch)

**Automated mode**: commit E2E changes and push immediately without pausing.

### Step 7 — Reply to Each Comment Thread

After pushing, for each addressed comment:

```sh
gh pr comment <pr-number> --body "Addressed in <commit-sha>: <one-line explanation of what was changed>"
```

One reply per comment thread. Keep the explanation concise — it helps the reviewer navigate directly to the fix.

### Step 8 — Update the PR Description

Append a feedback round section to the existing PR description. **Never replace the full body.**

1. Read the current PR description:

```sh
gh pr view <pr-number> --json body --jq '.body'
```

2. Append the following section and write it back:

```sh
gh pr edit <pr-number> --body "<existing body>

---

## Feedback Round <N>

**Round**: <N>
**Comments addressed**: <count>

### Changes Made
- `<commit-sha>`: <what was fixed and why>

**Status**: Ready for re-review"
```

### Step 9 — Done Signal

Report to the user:

- How many comments were addressed
- The commits made (sha + one-line description each)
- Confirm the PR description was updated
- Remind the user to resolve the threads on GitHub manually

---

## Rules

- **Never create a new branch** — all fixes commit to the existing feature branch
- **Part A ends at Step 2.5** — do not invoke any developer agent before `feature-agent` receives user approval and passes execution mode
- **`lead-pr-reviewer` must approve before E2E tests run** — never invoke `e2e-tester` before Step 3.5 is complete
- **Max 2 review cycles** (Step 3.5) before pausing and asking the user how to proceed
- **Interactive mode: never commit or push until the user confirms** at Step 4 (implementation checkpoint) and Step 6 (pre-push gate)
- **Never replace the full PR description** — only append the `## Feedback Round N` section
- **One reply per comment thread** — do not batch multiple fixes into one comment
- Max 1 feedback round per invocation — if the user wants another round, they invoke `feature-agent` again with the PR number
