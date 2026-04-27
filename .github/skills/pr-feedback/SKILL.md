---
name: pr-feedback
description: "Workflow for addressing human review comments on an existing GitHub PR. Use when feature-agent is invoked in feedback mode (e.g. 'PR #42 has feedback to address'). Covers ingesting PR context and comments via gh CLI, routing to developer agents, committing fixes to the existing branch, replying to comment threads, and updating the PR description with a feedback round summary."
argument-hint: "Provide the PR number."
---

# PR Feedback Workflow

## When to Use

- A human has reviewed an open PR and left review comments on GitHub
- `feature-agent` was invoked with a prompt like "PR #42 has feedback to address"
- You need to route those comments to the correct developer agents and signal completion back to the reviewer

## Procedure

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

### Step 3 — Hand Off to Developer Agent(s)

Invoke the correct agent(s) with this context package:

1. **Feature context** — the `## Feature Context` section from the PR description
2. **Fix list** — each review comment as a numbered fix item
3. **Branch name** — must commit all fixes to the existing branch, NOT create a new one
4. **Instruction** — signal clearly when all fixes are committed

If multiple stacks are involved, route to each agent in this order:
`backend-dev` → `frontend-dev` → `infra-engineer`

### Step 4 — Reply to Each Comment Thread

After the developer agent confirms fixes are committed, for each addressed comment:

```sh
gh pr comment <pr-number> --body "Addressed in <commit-sha>: <one-line explanation of what was changed>"
```

One reply per comment thread. Keep the explanation concise — it helps the reviewer navigate directly to the fix.

### Step 5 — Update the PR Description

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

### Step 6 — Done Signal

Report to the user:

- How many comments were addressed
- The commits made (sha + one-line description each)
- Confirm the PR description was updated
- Remind the user to resolve the threads on GitHub manually

## Rules

- **Never create a new branch** — all fixes commit to the existing feature branch
- **Never invoke `lead-pr-reviewer`** — the human is the reviewer in this flow
- **Never replace the full PR description** — only append the `## Feedback Round N` section
- **One reply per comment thread** — do not batch multiple fixes into one comment
- Max 1 feedback round per invocation — if the user wants another round, they invoke `feature-agent` again with the PR number
