---
applyTo: "{hub/**,tools/astrogram/**,tools/starwizz/**,libs/**}"
---

# Angular Rules

## Component Fundamentals

- `standalone: true` on ALL components. No NgModules.
- `changeDetection: ChangeDetectionStrategy.OnPush` on ALL components.
- DI: ALWAYS `inject()`. NEVER constructor injection.
- Control flow: ALWAYS `@if`, `@for`, `@switch`. NEVER `*ngIf`, `*ngFor`.
- ALWAYS use `track` in `@for` loops — e.g. `@for (item of items(); track item.id)`.
- Do NOT use the `async` pipe. Use `toSignal()` with a defined `initialValue` for one-off observables.
- Do NOT call `markForCheck()` when using Signals or Signal Store.
- Wrap DOM side effects in `afterNextRender()` or `effect()` — always provide cleanup.
- NEVER use `any` without explicit documented justification.

## Signals & Reactivity

- `signal()` / `model()` for component-local UI state (transient, single-component only).
- `computed()` for ALL derived state — never recompute derived values inline in templates.
- NgRx Signal Store (in a co-located `store/` directory) for any state that is shared across
  components/routes or must survive navigation.
- NEVER store API response data in a component-local signal.
- NEVER inject a store into `/libs/ui` components.
- Avoid manual RxJS subscriptions where a signal-based alternative exists.
- Avoid side effects in templates — all side effects belong in `effect()` or service methods.

## Data Layer

- ALL HTTP calls live in services. NEVER call `HttpClient` from a component or store.
- Services are stateless: they map raw DTOs to typed domain models and return observables.
- `rxResource` is only permitted in a component when data is single-component, read-only,
  and not shared. Always handle `isLoading` and `error` states in templates.

## Performance

- ALWAYS use `track` in `@for` — no exceptions.
- Lazy-load feature routes. Each feature module/set of routes should use `loadComponent`
  or `loadChildren`.
- Avoid unnecessary signal reads in tight loops or deeply nested computed chains.
- Keep `/libs/ui` components lightweight — no heavy dependencies.

## Error Handling

- Every service method must handle errors explicitly (`catchError` in RxJS pipelines).
- Components must always render error state — never assume a request succeeded.
- NEVER swallow errors silently.

## `/libs/ui` Specific

- Presentational ONLY: no HTTP, no stores, no business logic, no side effects.
- Only `input()` / `output()` bindings. Fully driven by the parent.
- No store injections.

## `/hub/*` Specific (AnalogJS SSR)

- File-based routing via AnalogJS `src/app/pages/` ONLY. No `AppRouter` configs.
- No direct `window`/`document` access outside `afterNextRender` — SSR is active.
- Ensure all pages are SEO-safe: no browser-only APIs at render time.

## Styling

- All static CSS lives in `.scss`. `[style.X]` bindings for runtime state-driven values only.
- Use `var(--token-name)` from `/libs/theme`. NEVER hardcode hex or color values.

## Testing

- Co-located `.spec.ts` for every service, store, and utility function.
- Test via inputs/outputs and rendered DOM output — not internal implementation details.
- Test stores by mocking services and asserting on signal values after method calls.
- `it()` reads as user-facing behaviour: `'should show an error when the input is empty'`.
- Do NOT use `NO_ERRORS_SCHEMA` — properly import or stub all dependencies.
- Do NOT modify tests just to make them pass — fix the code instead.

## Naming Conventions

- Booleans: `is`, `has`, `can` prefix — `isLoading`, `hasError`, `canGenerate`
- Stores: `[Feature]Store` — `AstrogramStore`, `AuthStore`
- Services: `[Domain]Service` — `ExposureService`, `StarfieldService`
- Raw API DTOs: `[Name]Dto` — `RawExposureDto`
- Domain models: plain noun, no suffix — `Exposure`, `StarfieldConfig`
