# `RELEASE_PLEASE_TOKEN` Runbook

The `release-please` job in [workflows/pipeline.yml](workflows/pipeline.yml) authenticates with a Personal Access Token (PAT) stored as the `RELEASE_PLEASE_TOKEN` repository secret. This document is the source of truth for what that PAT must look like and how to fix it when it breaks.

---

## Why a PAT instead of `GITHUB_TOKEN`?

When a workflow opens a pull request using the built-in `GITHUB_TOKEN`, GitHub deliberately blocks that PR from triggering other workflows. Without a PAT, the `verify` job would never run on `release-please`'s release PRs, and you could not merge them. A PAT authenticates as a real user, whose pushes do trigger workflows.

## Why this PAT keeps failing

Two traps that repeat indefinitely until you address them at the source:

1. **Fine-grained PATs default to 30 days expiration.** When the token expires, the pipeline starts failing — silently if you don't have the preflight step, loudly with the preflight in place.
2. **Regenerating a PAT does NOT preserve previous permissions.** Every regeneration is a blank slate; you must re-tick every checkbox. It is extremely easy to forget `Contents: Read and write`, which causes the create-release API call to return `404 Not Found` (GitHub returns 404 rather than 403 for write operations the token cannot perform).

Both traps are eliminated by following this runbook exactly.

---

## Required PAT settings

### Fine-grained PAT (recommended)

GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → **Generate new token**.

| Field                  | Value                                                                |
| ---------------------- | -------------------------------------------------------------------- |
| Token name             | `release-please <repo-name>`                                         |
| Expiration             | **Never** (or 1 year max — see expiration trap above)                |
| Repository access      | Only select repositories → this repo                                 |
| Repository permissions | **Contents: Read and write** ← controls release creation             |
| Repository permissions | **Pull requests: Read and write** ← needed to open/update release PR |
| Repository permissions | Metadata: Read-only (auto-selected, leave as-is)                     |

`Contents: Read and write` is the one that governs creating releases. `Read-only` is enough to fetch `package.json` (which is why the action logs `✔ Fetching package.json` even with a broken PAT) but not to POST a release.

### Classic PAT (alternative)

If your organization disables fine-grained PATs, use a classic PAT with the full **`repo`** scope. `public_repo` alone is not enough — release creation requires full `repo`.

---

## Installing the token

GitHub → repo Settings → Secrets and variables → Actions → Repository secrets → create or update `RELEASE_PLEASE_TOKEN`.

Paste the token value as shown when generated. GitHub displays the token exactly once; if you lose it, regenerate.

---

## Verifying it works

Push any commit to `main`. The `Preflight RELEASE_PLEASE_TOKEN` step in the `release-please` job creates a draft release and deletes it immediately, exiting with a clear pass/fail message:

- ✅ `RELEASE_PLEASE_TOKEN has permission to create releases.` — you are done.
- ❌ HTTP `401` — token invalid or expired; regenerate.
- ❌ HTTP `403` or `404` — token missing `Contents: Read and write`; regenerate with correct permissions.
- ❌ empty secret — secret was never set or was deleted.

Draft releases are not visible to non-collaborators and do not trigger webhooks or notifications, so the preflight is safe to run on every push.

---

## Failure quick reference

| Symptom                                                                       | Cause                                  | Fix                                                                  |
| ----------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------- |
| `RELEASE_PLEASE_TOKEN secret is empty or unset`                               | Secret never set or deleted            | Create the secret per [Installing the token](#installing-the-token). |
| Preflight returns HTTP 401                                                    | PAT expired or revoked                 | Regenerate the PAT.                                                  |
| Preflight returns HTTP 403 or 404                                             | PAT missing `Contents: Read and write` | Regenerate with the permissions listed above.                        |
| `release-please failed: Not Found - create-a-release` (no preflight in logs)  | Same as 403/404 above                  | Same as above.                                                       |
| `release-please failed` with something other than `Not Found - create-...`    | Not a PAT issue                        | Read the action output and investigate from there.                   |

---

## Pinned action version

The workflow pins `googleapis/release-please-action` to a specific commit SHA (currently `v4.4.1`). When upgrading, replace both the SHA and the trailing comment in `pipeline.yml`. Avoid floating tags like `@v4` — they pull whatever the maintainer points the tag at, which has caused surprise behavior changes here before.
