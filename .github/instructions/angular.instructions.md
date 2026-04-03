---
applyTo: "{hub/**,tools/astrogram/**,tools/starwizz/**,libs/**}"
---

# Angular Rules

## Component Fundamentals

- `standalone: true` on ALL components. No NgModules.
- `changeDetection: ChangeDetectionStrategy.OnPush` on ALL components.
- DI: ALWAYS `inject()` in the class field / injection context. NEVER constructor injection. NEVER call `inject()` inside a method body — it will throw at runtime.
- Constructors must contain only field initialisers and `inject()` calls. NEVER put logic in a constructor — use `ngOnInit`, `ngOnDestroy`, or `effect()` instead.
- Control flow: ALWAYS `@if`, `@for`, `@switch`. NEVER `*ngIf`, `*ngFor`.
- ALWAYS use `track` in `@for` loops — e.g. `@for (item of items(); track item.id)`.
- Do NOT use the `async` pipe. Use `toSignal()` with a defined `initialValue` for one-off observables.
- Do NOT call `markForCheck()` when using Signals or Signal Store.
- Wrap DOM side effects in `afterNextRender()` or `effect()` — always provide cleanup.
- NEVER use `any` without explicit documented justification.
- NEVER use `as SomeType` casts or `!` non-null assertions without a documented justification comment.

## Signals & Reactivity

- `signal()` / `model()` for component-local UI state (transient, single-component only).
- `computed()` for ALL derived state — never recompute derived values inline in templates.
- NgRx Signal Store (in a co-located `store/` directory) for any state that is shared across
  components/routes or must survive navigation.
- NEVER store API response data in a component-local signal.
- NEVER inject a store into `/libs/ui` components.
- Avoid manual RxJS subscriptions where a signal-based alternative exists.
- When an RxJS subscription is unavoidable, always use `takeUntilDestroyed()` to prevent memory leaks.
- Signal values that are objects or arrays must be replaced via `.set()` / `.update()` — never mutated by reference.
- Avoid side effects in templates — all side effects belong in `effect()` or service methods.

## Modern Angular APIs (v17+)

- Use signal-based `input()` / `output()` for ALL component I/O. NEVER use `@Input()` / `@Output()` decorators.
- Use signal-based `viewChild()` / `viewChildren()` / `contentChild()` instead of `@ViewChild` / `@ContentChild` decorators.
- Use `@defer` blocks to lazily render heavy or below-the-fold template sections. Prefer `@defer` over manual `loadComponent` for template-level lazy loading.
- Route guards must be functional: `canActivate: [() => inject(AuthGuard).check()]` or a plain function. NEVER use class-based guards with `CanActivate` interface.
- HTTP interceptors must be functional (`withInterceptors([...])`). NEVER use class-based `HttpInterceptor`.

## Forms

- Use **reactive forms** (`FormGroup`, `FormControl`) for all non-trivial forms. Template-driven forms are only acceptable for single, isolated fields with no validation logic.
- Form models must be strongly typed — always use typed `FormControl<T>` and `FormGroup<{...}>`.
- Validation logic lives in the form definition or a dedicated validator function — NEVER inline in the template.

## Data Layer

- ALL HTTP calls live in services. NEVER call `HttpClient` from a component or store.
- Services are stateless: they map raw DTOs to typed domain models and return observables.
- Services depend on abstractions (injection tokens / interfaces), not concrete implementations (DIP). This makes services independently testable via mock providers.
- Services must use `providedIn: 'root'` unless component-scoped provision is explicitly justified. Never leave `providedIn` unset.
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

## Security

- NEVER bind to `[innerHTML]` directly with user-controlled data — always sanitize via `DomSanitizer.sanitize()`.
- NEVER use `bypassSecurityTrust*` methods unless you own and control the entire content source.
- Avoid direct `document.write`, `eval`, or dynamic `<script>` injection.

## Accessibility

- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`, `<header>`, etc.) — never a `<div>` where a semantic element exists.
- Interactive elements must be keyboard-navigable and have a visible focus state.
- Images must have descriptive `alt` text. Decorative images use `alt=""`.
- Use ARIA attributes only when semantic HTML is insufficient — prefer native semantics.

## `/libs/ui` Specific

- Presentational ONLY: no HTTP, no stores, no business logic, no side effects.
- Only `input()` / `output()` bindings. Fully driven by the parent.
- No store injections.

## `/hub/*` Specific (AnalogJS SSR)

- File-based routing via AnalogJS `src/app/pages/` ONLY. No `AppRouter` configs.
- No direct `window`/`document` access outside `afterNextRender` — SSR is active.
- Ensure all pages are SEO-safe: no browser-only APIs at render time.

## Styling

- ALWAYS use `templateUrl` pointing to a separate `.html` file. NEVER inline `template: \`...\`` in the decorator.
- ALWAYS use `styleUrl` pointing to a separate `.scss` file. NEVER inline `styles: [...]` in the decorator.
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
- Guards: `[Feature]Guard` — `AuthGuard`
- Pipes: `[Name]Pipe` — `FormatCoordsPipe`
- Directives: `[Name]Directive` — `HighlightDirective`
- Resolvers: `[Feature]Resolver` — `DossierResolver`
- Raw API DTOs: `[Name]Dto` — `RawExposureDto`
- Domain models: plain noun, no suffix — `Exposure`, `StarfieldConfig`
