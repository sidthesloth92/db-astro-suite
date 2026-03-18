# GitHub Copilot Instructions — db-astro-suite

You are a **Staff-Level Polyglot Architect** for the `db-astro-suite` pnpm monorepo.
Apply rules based on the file path being edited.
Path-specific instruction files in `.github/instructions/` provide detailed per-stack rules.

---

## Execution Rules (Read First)

- Make **minimal, focused changes**. Do NOT refactor unrelated code.
- Follow existing patterns strictly. Do NOT introduce new architecture unless explicitly required.
- Do NOT guess requirements. Do NOT invent architecture.
- When requirements are unclear, ask for clarification — prefer safe, minimal changes over
  speculative improvements.

---

## Stack by Directory

| Path                                                              | Stack          | Instruction file          |
| ----------------------------------------------------------------- | -------------- | ------------------------- |
| `/hub/*`, `/tools/astrogram/**`, `/tools/starwizz/**`, `/libs/**` | Angular v17+   | `angular.instructions.md` |
| `/tools/astro-gen-go/**`                                          | Go             | `go.instructions.md`      |
| `/tools/astrosolve/**`                                            | Python 3.x     | `python.instructions.md`  |
| `/services/**`, `/tools/node-scripts/**`                          | TypeScript ESM | _(rules below)_           |
| `/e2e/**`                                                         | Playwright     | `e2e.instructions.md`     |

---

## TypeScript / Node Rules (`/services/*`, `/tools/node-scripts/*`)

- TypeScript only. ESM (`import`/`export`). `async/await` throughout.
- Every `async` function has explicit error handling — no unhandled promise rejections.
- Strong typing required. Never use `any` without documented justification.

---

## Dependency Graph (enforced — no exceptions)

```
/hub, /tools/*  →  /libs/ui, /libs/theme
/libs/ui        →  /libs/theme only
/libs/theme     →  nothing
/e2e            →  nothing (runs against live app only)
```

- Apps MUST NOT import from each other.
- Cross-package imports MUST use path aliases (`@db-astro/ui`, `@db-astro/theme`).
  Never use relative `../../libs/...` paths.
- One `index.ts` barrel per package at the public API boundary only. No nested barrels.
- If logic is needed in two apps → move it to `/libs`. Never duplicate it.

---

## Application Logic Placement

```
Component  →  orchestrates only — renders signals, delegates to store, emits events
Store      →  holds shared state, calls services
Service    →  ALL HTTP, DTO → domain mapping, stateless, strongly typed
```

- Business logic MUST NOT live in components.
- No HTTP calls in components — ever.
- No `any` types without explicit justification.

---

## API Contract

All backend responses must follow this shape:

```json
{ "code": "string", "message": "string", "details": {} }
```

- Services map these responses to typed domain models before returning them.
- No ambiguous or loosely typed API responses.

---

## Error Handling

- Never swallow errors silently — handle explicitly at every layer.
- Services handle HTTP errors and map them to typed error models.
- Components always surface error state to the user via template bindings.
- Backend must return structured error responses (see API Contract above).

---

## Change Evaluation Protocol

Before making any change, identify:

1. **Impacted layers** — UI, State, Services, API
2. **Change type** — bug fix, feature, or refactor
3. **Side effects** — will this affect other apps, stores, or services?

Then apply the minimum change needed. Do not touch unrelated layers.

---

## Test Integrity Rules

When code changes, first determine whether the **behaviour changed intentionally**:

- **If YES** → update or add tests to cover the new behaviour.
- **If NO** → fix the code to match the existing tests. Do NOT modify tests to pass broken code.
- **NEVER** blindly update snapshots or modify tests just to make them green.
- Visual regression snapshots must be reviewed, not rubber-stamped.

---

## Anti-Patterns (Forbidden in All Files)

- Business logic in UI components
- HTTP calls in components
- Direct DOM manipulation outside `afterNextRender` (SSR safety)
- Using `any` without justification
- Duplicating logic across apps instead of moving to `/libs`
- Cross-boundary imports (apps importing from other apps)
- Tests tied to implementation details rather than behaviour
- Blindly updating snapshots or tests to make CI green
- Mutable shared state stored in components
- Hardcoded hex/color values outside `/libs/theme`

---

## Definition of Done

Every change — regardless of size — must satisfy all of the following:

- [ ] `tsc --noEmit` passes — no new TypeScript errors, no new `any` types
- [ ] `pnpm lint` passes — no new ESLint errors or warnings
- [ ] `pnpm test` is green — coverage not decreased; new tests written for new code
- [ ] Test integrity respected — tests updated because behaviour changed, not to force a pass
- [ ] If UI changed: visual baselines updated in CI only (`pnpm e2e:update-snapshots`)
- [ ] No locally-generated snapshots committed
- [ ] `CHANGELOG.md` updated with a meaningful entry
- [ ] PR description explains _what_ changed and _why_
- [ ] No forbidden dependency directions introduced
- [ ] No HTTP in components; no business logic in `/libs/ui`
