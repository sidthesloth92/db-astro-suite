---
name: create-pr
description: "Workflow for pushing a feature branch and opening a GitHub PR with a rich, structured description. Use in feature-agent Phase 3.5 after all implementation, review, and E2E phases are complete. Covers PR description template, git push, gh pr create, and printing the PR URL."
argument-hint: "Provide the feature branch name, base branch, all files changed, original plan, decisions made, review cycles, and out-of-scope items."
---

# Create PR Workflow

## When to Use

- At the end of a feature pipeline (after implementation, review, and E2E testing are complete)
- Always invoked by `feature-agent` Phase 3.5

## Procedure

### Step 1 — Push the Branch

```sh
git push -u origin <feature-branch>
```

Confirm the push succeeded before proceeding.

### Step 2 — Assemble the PR Description

Compose the PR body using all context accumulated during the feature pipeline:

```md
## Feature Context

**Feature**: <original user description>
**Stack**: <frontend | backend | infra | full-stack | mixed>
**Branch**: <feature-branch> → <base-branch>

## Original Plan

<the Phase 0 plan verbatim — feature summary, agents invoked, known files, E2E coverage, out of scope>

## What Was Implemented

<!-- One entry per changed file — file path and one-line reason -->

- `<file>` — <why this file was changed>

## Decisions Made

<!-- Technical choices that may not be obvious from the code -->

- <decision and rationale>

## Internal Review Cycles

- <N> cycle(s) — <N> MUST FIX items resolved before PR was opened

## Out of Scope

<!-- Explicitly excluded — helps the human reviewer know what NOT to look for -->

- <item>
```

### Step 3 — Open the PR

```sh
gh pr create \
  --base <base-branch> \
  --head <feature-branch> \
  --title "<conventional-commit title>" \
  --body "<assembled description from Step 2>"
```

**Title rules** (Conventional Commits):

- `feat(<scope>): <short description>` — new functionality
- `fix(<scope>): <short description>` — bug fix
- `refactor(<scope>): <short description>` — refactor, no behaviour change
- `chore(<scope>): <short description>` — tooling, config, infra
- Scope is the affected package/area (e.g. `hub`, `astrosolve`, `e2e`, `pipeline`)

### Step 4 — Print the PR URL

After `gh pr create` succeeds, print the full PR URL so the user can navigate directly to it.
