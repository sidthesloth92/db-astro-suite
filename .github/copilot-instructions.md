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
| `/tools/astrosolve/**`                                            | Node.js ESM    | `node.instructions.md`    |
| `/services/**`, `/tools/node-scripts/**`                          | TypeScript ESM | _(rules below)_           |
| `/e2e/**`                                                         | Playwright     | `e2e.instructions.md`     |

---

## TypeScript / Node Rules (`/services/*`, `/tools/node-scripts/*`)

- TypeScript only. ESM (`import`/`export`). `async/await` throughout.
- Every `async` function has explicit error handling — no unhandled promise rejections.
- Strong typing required. Never use `any`, `as SomeType` casts, or `!` non-null assertions without documented justification.
- Throw domain-specific error subclasses (e.g. `class SolveError extends Error`) from business logic. Never throw a plain `new Error('...')` from a service — it forces fragile string-matching at the catch site.
- Use the application framework's structured logger (e.g. Fastify's `request.log`). Never use `console.log/error` in production code.
- Read all environment variables once at startup into a validated config object. Never scatter `process.env.X` reads across business logic files.

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

## File Naming Conventions (All Languages)

Every discrete concern lives in its own file. Apply across Angular, Node/TypeScript, Go, and Python:

| Content                          | File suffix / pattern                      |
| -------------------------------- | ------------------------------------------ |
| Domain / DTO model class or type | `*.model.ts` / `*_model.py` / `*_model.go` |
| Constants                        | `*.constants.ts` / `*_constants.py`        |
| Enums                            | `*.enum.ts` / `*_enum.py`                  |
| Interfaces (TS)                  | `*.interface.ts`                           |
| Type aliases (TS)                | `*.types.ts`                               |
| Services (business logic)        | `*.service.ts` / `*.service.js`            |
| Routes / controllers             | `*.route.ts` / `*.route.js`                |
| Domain error classes             | `*.error.ts` / `*.error.js` / `errors.js`  |
| Config / startup                 | `*.config.ts` / `*.config.js`              |
| Utility functions                | `*.util.ts` / `*.util.js`                  |

- Never co-locate model classes, constants, or enums inside service, component, or route files.
- One concept per file — a model file holds one primary model (and closely related sub-types only).
- Barrel files (`index.ts`) re-export at the package boundary; they do not define types themselves.

---

## SOLID Principles

All code in this repository must respect these principles:

- **SRP** — Every class, function, and file has exactly one reason to change. If a unit does more than one thing, split it.
- **OCP** — Extend behaviour through new code (new implementations, new parameters, composition), not by modifying existing stable code.
- **LSP** — Subtypes and implementations must be substitutable for their base type/interface without changing caller behaviour.
- **ISP** — Define small, consumer-focused interfaces. A consumer should never be forced to depend on methods it does not use. Prefer several small interfaces over one large one.
- **DIP** — High-level modules depend on abstractions (interfaces / injection tokens), not concrete implementations. Inject dependencies; do not instantiate them inside a class.

---

## Immutability

- Prefer immutable data. Never mutate an object or array in place — produce new values (`spread`, `map`, `filter`, `structuredClone`).
- Signal values that are objects or arrays must be replaced via `.set()` / `.update()` — never mutated by reference.
- DTOs and domain models received from services are treated as read-only at all call sites.

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
- Mutating objects or arrays in place — always produce new values
- Defining models, constants, or enums inline inside service or component files
- Fat interfaces that bundle unrelated methods — split by consumer need (ISP)
- Instantiating dependencies inside a class instead of injecting them (DIP violation)

---

## Definition of Done

Every change — regardless of size — must satisfy all of the following:

- [ ] `tsc --noEmit` passes — no new TypeScript errors, no new `any` types
- [ ] `pnpm lint` passes — no new ESLint errors or warnings
- [ ] `pnpm test` is green — coverage not decreased; new tests written for new code
- [ ] Test integrity respected — tests updated because behaviour changed, not to force a pass
- [ ] If UI changed: visual baselines updated in CI only (`pnpm e2e:update-snapshots`)
- [ ] No locally-generated snapshots committed
- [ ] Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, etc.) — release-please auto-generates `CHANGELOG.md` from these; do **not** edit `CHANGELOG.md` manually
- [ ] PR description explains _what_ changed and _why_
- [ ] No forbidden dependency directions introduced
- [ ] No HTTP in components; no business logic in `/libs/ui`
