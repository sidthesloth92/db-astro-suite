---
name: angular-component
description: "Step-by-step workflow for creating or modifying Angular v17+ components, stores, and services in db-astro-suite. Use when: building a new component, adding a feature to hub/astrogram/starwizz, creating an NgRx Signal Store, scaffolding a service, wiring a new route, or adding to libs/ui. Covers file structure, signals, OnPush, inject(), reactive forms, and co-located unit tests."
argument-hint: "Describe the component or feature you are building."
---

# Angular Component / Feature Workflow

## When to Use

- Creating a new standalone Angular component
- Adding state management with NgRx Signal Store
- Building or modifying an Angular service
- Wiring a new route or lazy-loaded feature
- Adding to `libs/ui` (presentational components only)

## Procedure

### Step 1 — Identify the Layer

Determine which layer the work belongs to before writing any code:

| Layer     | Location                       | Role                                                        |
| --------- | ------------------------------ | ----------------------------------------------------------- |
| Component | `src/app/<feature>/`           | Renders signals, delegates to store/services, emits events  |
| Store     | `src/app/<feature>/store/`     | Shared state, calls services, exposes signals               |
| Service   | `src/app/<feature>/services/`  | HTTP calls, DTO → domain mapping, stateless                 |
| Lib UI    | `libs/ui/src/lib/<component>/` | Presentational only — no HTTP, no stores, no business logic |

### Step 2 — Create Files (one concept per file)

```
<feature>/
  <feature>.component.ts          # Component shell only
  <feature>.component.html        # Template (no inline templates)
  <feature>.component.scss        # Styles — design tokens only
  <feature>.component.spec.ts     # Unit test
  <feature>.model.ts              # Domain / DTO types
  <feature>.service.ts            # HTTP + DTO → domain mapping
  store/
    <feature>.store.ts            # NgRx Signal Store (if shared state needed)
```

Never co-locate models, constants, or enums inside component or service files.

### Step 3 — Component Shell (mandatory attributes)

```typescript
@Component({
  selector: 'app-<feature>',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...],
  templateUrl: './<feature>.component.html',
  styleUrl: './<feature>.component.scss',
})
export class <Feature>Component {
  private readonly featureStore = inject(<Feature>Store);

  // Signal inputs — never @Input()
  readonly title = input.required<string>();

  // Signal outputs — never @Output()
  readonly selected = output<string>();

  // Computed derived state — never recompute inline in templates
  readonly displayTitle = computed(() => this.title().toUpperCase());
}
```

### Step 4 — Signals & State Checklist

- [ ] `signal()` for component-local UI state only (transient, single-component)
- [ ] `computed()` for ALL derived values — never recompute inline in templates
- [ ] NgRx Signal Store for shared or API-response state
- [ ] No `async` pipe — use `toSignal()` with `initialValue`
- [ ] Signal objects replaced via `.set()` / `.update()` — never mutated in place
- [ ] No API response stored in a component-local signal

### Step 5 — Template Checklist

- [ ] `@if` / `@for` / `@switch` — never `*ngIf` / `*ngFor`
- [ ] `track item.id` in every `@for` loop
- [ ] Error state rendered — never assume a request succeeded
- [ ] Semantic HTML elements (`<button>`, `<nav>`, `<main>`) not `<div>` everywhere
- [ ] No hardcoded colors — design tokens from `@db-astro-suite/theme` only

### Step 6 — Service Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class <Feature>Service {
  private readonly http = inject(HttpClient);

  getFeature(id: string): Observable<<Feature>Model> {
    return this.http.get<FeatureDto>(`/api/feature/${id}`).pipe(
      map(dto => mapToFeatureModel(dto)),
      catchError(err => { throw new FeatureError('Failed to load', { cause: err }); })
    );
  }
}
```

- Stateless — no shared mutable fields
- Map raw DTOs to typed domain models before returning
- Handle errors explicitly with `catchError`

### Step 7 — Dependency Rules

- Cross-package imports: `@db-astro-suite/ui`, `@db-astro-suite/theme` — never relative `../../libs/...`
- Apps must not import from each other
- `libs/ui` components must not inject stores or call `HttpClient`

### Step 8 — Unit Test (co-located `.spec.ts`)

- Test DOM output and user-observable behaviour — not implementation details
- Never use `NO_ERRORS_SCHEMA`
- Mock services via `TestBed.overrideProvider`
- Test error states as well as happy paths
- Use `input()` signal test helpers for component inputs

### Step 9 — Definition of Done

- [ ] `tsc --noEmit` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` green — new tests written for new behaviour
- [ ] No `any`, no forbidden imports, no business logic in components
- [ ] Existing Playwright specs updated if behaviour intentionally changed
