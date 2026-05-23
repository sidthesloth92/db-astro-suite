---
name: pipeline-ops
description: "Step-by-step verification workflow for CI/CD pipeline changes in db-astro-suite. Use when: auditing GitHub Actions YAML, modifying deploy jobs, updating the Dockerfile, investigating why a deploy did or did not trigger, changing release-please config, or adding a new pipeline job. Covers trigger conditions, job dependencies, secret handling, Docker/GHCR config, and VPS SSH deploy verification."
argument-hint: "Describe the pipeline issue or infra config change to verify."
---

# CI/CD Pipeline Ops Workflow

## When to Use

- Reviewing or modifying `.github/workflows/pipeline.yml`
- Updating `tools/astrosolve/server/Dockerfile`
- Investigating why a deploy job did or did not trigger
- Adding a new pipeline job
- Verifying secret references are safe before a change merges

## Pipeline Architecture (db-astro-suite)

```
Trigger: push to main  OR  pull_request to main
│
├─ verify (job)
│   Runs: all PRs + main pushes that are NOT release merges
│   Steps: install → build → playwright tests → upload playwright report artifact
│
├─ release-please (job, needs: verify)
│   Runs: main pushes only, NOT release merges
│   Creates / updates release PR via googleapis/release-please-action@v4
│
└─ On "chore(main): release" commit (release merge to main):
    ├─ deploy
    │   → GitHub Pages from ./dist via actions/deploy-pages@v4
    │
    ├─ build-backend-image
    │   → Docker build + push to GHCR
    │     ghcr.io/<owner>/db-astro-suite-astrosolve:<version>
    │     version sourced from package.json via python3
    │
    └─ deploy-backend (needs: build-backend-image)
        → SSH to VPS
          runs /opt/astrosolve/scripts/server_deploy.sh <version>
```

**Deployment authority is held exclusively by the human operator.** This workflow is for verification and authoring only.

## Procedure

### Step 1 — Understand the Change Intent

Identify what the pipeline change is for before touching anything:

- New deploy target?
- Modified trigger condition?
- Updated tool version (Node, pnpm, Playwright, Docker action)?
- New secret needed?
- Dockerfile update?

### Step 2 — Verify Trigger `if:` Conditions

The most error-prone area. Verify each job's `if:` exactly:

| Job                   | Should run when                                                   |
| --------------------- | ----------------------------------------------------------------- |
| `verify`              | All PRs + main pushes that are NOT release merges                 |
| `release-please`      | Main pushes only, NOT release merges, after `verify` passes       |
| `deploy`              | Main pushes ONLY where commit starts with `chore(main): release`  |
| `build-backend-image` | Same as `deploy`                                                  |
| `deploy-backend`      | Same as `deploy`, AND `build-backend-image` result == `'success'` |

Release merge guard pattern: `startsWith(github.event.head_commit.message, 'chore(main): release')`

### Step 3 — Verify `needs:` Chains

- `deploy-backend` must `needs: build-backend-image`
- `release-please` must `needs: verify`
- No orphaned jobs (jobs that should depend on a prior job but don't)
- `if: always() && needs.<job>.result == 'success'` pattern used where appropriate

### Step 4 — Secret Reference Audit

Scan all `${{ ... }}` expressions. Every sensitive value must be a secret reference:

| Value           | Expected reference                      |
| --------------- | --------------------------------------- |
| SSH private key | `${{ secrets.DEPLOY_SSH_KEY }}`         |
| VPS host        | `${{ secrets.DEPLOY_HOST }}`            |
| VPS user        | `${{ secrets.DEPLOY_USER }}`            |
| GHCR token      | `${{ github.token }}` (automatic, safe) |

**MUST FIX**: any hardcoded IP address, hostname, username, password, or token in YAML.

### Step 5 — Docker / GHCR Verification

```yaml
# Correct image naming (lowercase owner)
ghcr.io/${GITHUB_REPOSITORY_OWNER,,}/db-astro-suite-astrosolve

# Correct Dockerfile context and file path
context: ./tools/astrosolve/server
file: ./tools/astrosolve/server/Dockerfile

# Version sourced from package.json — never hardcoded
version=$(python3 - <<'PY'
import json
with open('package.json', 'r', encoding='utf-8') as f:
    print(json.load(f)['version'])
PY)
```

Check:

- [ ] Image name uses `,,` (lowercase transform) on `GITHUB_REPOSITORY_OWNER`
- [ ] Context path matches actual Dockerfile location
- [ ] Version not hardcoded — always from `package.json`
- [ ] `docker/login-action` authenticates to `ghcr.io` before push

### Step 6 — VPS SSH Deploy Verification

```yaml
- uses: webfactory/ssh-agent@v0.9.0
  with:
    ssh-private-key: ${{ secrets.DEPLOY_SSH_KEY }}

- run: ssh-keyscan -H "${{ secrets.DEPLOY_HOST }}" >> ~/.ssh/known_hosts

- run: |
    ssh "${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }}" \
      "GHCR_USERNAME='...' GHCR_TOKEN='...' /opt/astrosolve/scripts/server_deploy.sh '<version>'"
```

Check:

- [ ] `ssh-agent` step present before any SSH commands
- [ ] `ssh-keyscan` adds host key (prevents MITM / interactive prompt failure)
- [ ] Deploy script path is `/opt/astrosolve/scripts/server_deploy.sh`
- [ ] Version argument passed correctly from `build-backend-image` outputs

### Step 7 — Artifact Paths

| Job                 | Artifact            | Path                 |
| ------------------- | ------------------- | -------------------- |
| `verify`            | `playwright-report` | `playwright-report/` |
| `deploy` (frontend) | Pages artifact      | `./dist`             |

Check:

- [ ] `upload-pages-artifact` path is `./dist` (the built frontend output)
- [ ] Playwright report artifact has appropriate retention days

### Step 8 — Tool Version Consistency

All jobs should use consistent pinned versions:

- Node: `20`
- pnpm: `9.15.0` (via `pnpm/action-setup@v3`)
- Deploy jobs use `--frozen-lockfile`

### Step 9 — Concurrency Check

```yaml
concurrency:
  group: "pages"
  cancel-in-progress: true
```

Verify this prevents parallel deploy races. If new deploy targets are added, consider separate concurrency groups per target.

### Step 10 — Dockerfile Checks

- [ ] Base image pinned to a specific tag — never `latest`
- [ ] No secrets or credentials baked into image layers
- [ ] Multi-stage build used to minimise final image size
- [ ] `COPY` only necessary files — not wholesale `COPY . .` of the entire repo root

### Step 11 — Produce Verification Report

```
## Pipeline Verification Report

### Checks Passed
- ...

### Issues Found
- [job:step] Description of issue and recommended fix

### Verdict
[ ] APPROVED — pipeline config is correct
[ ] CHANGES NEEDED — see Issues Found above
```
