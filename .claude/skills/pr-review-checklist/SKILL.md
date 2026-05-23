---
name: pr-review-checklist
description: "Structured review workflow for the Lead PR Reviewer. Use when reviewing any code change in db-astro-suite across Angular, Node.js, Go, or pipeline stacks. Covers the Definition of Done checklist, dependency graph validation, SOLID principles, anti-pattern detection, test integrity enforcement, naming conventions, and structured MUST FIX / SHOULD FIX / SUGGESTIONS output."
argument-hint: "Point to the files or changed code to review."
---

# PR Review Checklist Workflow

## When to Use

- Reviewing a completed feature from `frontend-dev` or `backend-dev`
- Reviewing an infra / pipeline change from `infra-engineer`
- Reviewing E2E test changes from `e2e-tester`
- Final verification gate before merge approval

## Procedure

### Step 1 — Gather Changed Files

Identify all files changed. Categorise by layer:

- Angular components / templates / stores / services (`hub/`, `tools/astrogram/`, `tools/starwizz/`, `libs/`)
- Node.js routes / services / models / errors (`tools/astrosolve/`)
- Go source files (`tools/astro-gen-go/`)
- Pipeline YAML / Dockerfile (`.github/workflows/`, `tools/astrosolve/server/`)
- Test files (`.spec.ts`, `.test.js`, `e2e/**`)

### Step 2 — Definition of Done

Verify each item:

- [ ] `tsc --noEmit` would pass — no new TypeScript errors, no new `any` types
- [ ] `pnpm lint` would pass — no new ESLint errors or warnings
- [ ] `pnpm test` green — coverage not decreased, new tests written for new code
- [ ] Tests updated because **behaviour changed intentionally**, NOT to force a pass
- [ ] No locally-generated snapshots committed
- [ ] Commits follow Conventional Commits (`feat:`, `fix:`, `refactor:`, etc.)
- [ ] `CHANGELOG.md` NOT manually edited (release-please generates it)
- [ ] No forbidden dependency direction introduced

### Step 3 — Dependency Graph Check

```
ALLOWED:
  hub/*, tools/*  →  libs/ui, libs/theme
  libs/ui         →  libs/theme only
  libs/theme      →  nothing
  e2e             →  nothing

FORBIDDEN (MUST FIX):
  app → other app
  relative ../../libs/... imports  (must use @db-astro/* aliases)
```

Scan all import statements for violations.

### Step 4 — Anti-Pattern Scan

Each item below is a **MUST FIX**:

**General:**

- [ ] No business logic in UI components
- [ ] No `HttpClient` calls in components or stores
- [ ] No `any` without a documented justification comment
- [ ] No `as SomeType` casts or `!` non-null assertions without justification
- [ ] No models / constants / enums defined inline inside service or component files
- [ ] No mutable shared state stored in components
- [ ] No hardcoded hex / color values outside `libs/theme`
- [ ] No in-place array or object mutation (must use spread / `map` / `filter`)
- [ ] No fat interfaces bundling unrelated methods (ISP)
- [ ] No `new ConcreteService()` inside a class (DIP — inject instead)
- [ ] No bare `catch {}` or silently swallowed errors
- [ ] No `console.log/error/warn` in production code
- [ ] No `process.env.X` reads scattered across business logic (must be startup config)

**Angular-specific:**

- [ ] `standalone: true` on every component
- [ ] `ChangeDetectionStrategy.OnPush` on every component
- [ ] `input()` / `output()` used — no `@Input()` / `@Output()` decorators
- [ ] `@if` / `@for` / `@switch` used — no `*ngIf` / `*ngFor`
- [ ] `track` present in every `@for` loop
- [ ] No `async` pipe — must use `toSignal()`
- [ ] `inject()` in field context only — never called inside a method body
- [ ] No API response stored in a component-local signal (use NgRx Signal Store)
- [ ] No store injected into a `libs/ui` component
- [ ] SSR-safe: DOM access only in `afterNextRender()` or `effect()`

**Node.js-specific:**

- [ ] Domain error subclasses used — not bare `throw new Error('...')`
- [ ] All API responses follow `{ code, message, details }` shape
- [ ] Services are stateless

**Go-specific:**

- [ ] All `if err != nil` checks present
- [ ] Errors wrapped with `fmt.Errorf("...: %w", err)`
- [ ] GoDoc on all exported identifiers

### Step 5 — SOLID Principles Check

| Principle | What to verify                                                             |
| --------- | -------------------------------------------------------------------------- |
| SRP       | Each class / file has exactly one reason to change                         |
| OCP       | New behaviour added via new code, not modifying stable existing code       |
| LSP       | Subtypes are substitutable for their base type without breaking callers    |
| ISP       | Small, consumer-focused interfaces — not one large interface               |
| DIP       | Depend on abstractions (interfaces / tokens), not concrete implementations |

### Step 6 — Test Integrity Check

For every modified test file:

1. Did the **behaviour change intentionally**? (Check commit message / PR description.)
2. **YES → test updated to match new behaviour** → acceptable.
3. **NO → test changed only to make CI green** → **MUST FIX**.
4. **Snapshot updated without confirmed intentional UI change** → **MUST FIX**.

### Step 7 — Naming Conventions Check

| Content            | Expected suffix                           |
| ------------------ | ----------------------------------------- |
| Domain / DTO model | `*.model.ts` / `*.model.js`               |
| Constants          | `*.constants.ts` / `*.constants.js`       |
| Enums              | `*.enum.ts`                               |
| Interfaces         | `*.interface.ts`                          |
| Type aliases       | `*.types.ts`                              |
| Service            | `*.service.ts` / `*.service.js`           |
| Route              | `*.route.ts` / `*.route.js`               |
| Error class        | `*.error.ts` / `*.error.js` / `errors.js` |
| Config             | `*.config.ts` / `*.config.js`             |
| Utility            | `*.util.ts` / `*.util.js`                 |

### Step 8 — Produce the Review

Output using this exact format:

```
## MUST FIX
(Blocking — PR cannot merge without these)
- [file:line] Issue

## SHOULD FIX
(Non-blocking but strongly recommended before merge)
- [file:line] Issue

## SUGGESTIONS
(Optional improvements or future considerations)
- [file:line] Suggestion

## VERDICT
[ ] APPROVED — no blocking issues
[ ] CHANGES REQUESTED — address MUST FIX items above
```

### Step 9 — Handoffs

- **CHANGES REQUESTED** → recommend `frontend-dev`, `backend-dev`, or `infra-engineer` with the full review.
- **No E2E coverage for new user flows** → recommend `e2e-tester`.
- **APPROVED** → no handoff needed.
