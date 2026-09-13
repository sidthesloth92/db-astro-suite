---
name: backend-api
description: "Step-by-step workflow for building a Node.js ESM (Fastify/astrosolve) API endpoint or Go (sortronomy) feature in db-astro-suite. Use when: adding a route, creating a service, defining domain models, adding error classes, setting up startup config, or writing co-located tests. Covers file naming, API contract shape, domain error pattern, config pattern, and test structure."
argument-hint: "Describe the API endpoint or Go feature you are building."
---

# Backend API / Feature Workflow

## When to Use

- Adding a new Fastify route in `tools/astrosolve/**`
- Creating a service with business logic
- Defining domain models or DTOs
- Adding domain error classes
- Building a Go CLI feature in `tools/sortronomy/**`
- Writing co-located tests

## Procedure (Node.js / Fastify)

### Step 1 — Plan the File Structure

```
src/
  <feature>/
    <feature>.route.js       # Route registration, request/response schema
    <feature>.service.js     # Business logic, stateless
    <feature>.model.js       # Domain types / DTOs
    <feature>.error.js       # Domain error subclasses
    <feature>.test.js        # Co-located tests
  config/
    config.js                # Startup config (read once, frozen)
```

Never define models, constants, or enums inline inside route or service files.

### Step 2 — Config (read once at startup)

```javascript
// src/config/config.js
const config = Object.freeze({
  port: Number(process.env.PORT ?? 3000),
  dbPath: process.env.DB_PATH ?? "./data/astro.db",
});

export { config };
```

Never use `process.env.X` inside a route or service file. Import from `config.js` instead.

### Step 3 — Domain Error Classes

```javascript
// <feature>.error.js
export class FeatureNotFoundError extends Error {
  constructor(id) {
    super(`Feature not found: ${id}`);
    this.name = "FeatureNotFoundError";
    this.code = "FEATURE_NOT_FOUND";
  }
}
```

Never `throw new Error('...')` from business logic — it forces string-matching at catch sites.

### Step 4 — Service (stateless)

```javascript
// <feature>.service.js
import { FeatureNotFoundError } from "./<feature>.error.js";
import { mapToFeatureModel } from "./<feature>.model.js";

/** @param {string} id @returns {Promise<import('./<feature>.model.js').FeatureModel>} */
export async function getFeature(id) {
  const row = await db.get("SELECT * FROM features WHERE id = ?", id);
  if (!row) throw new FeatureNotFoundError(id);
  return mapToFeatureModel(row);
}
```

- Stateless — no shared mutable state between calls
- All I/O via `async`/`await`
- Map raw DB rows / DTOs to typed domain models before returning

### Step 5 — Route (thin handler)

```javascript
// <feature>.route.js
import { getFeature } from "./<feature>.service.js";

export async function featureRoutes(fastify) {
  fastify.get("/feature/:id", async (request, reply) => {
    const feature = await getFeature(request.params.id);
    return reply.send({ code: "OK", message: "Success", details: feature });
  });
}
```

### Step 6 — API Contract (every response, no exceptions)

```json
{ "code": "string", "message": "string", "details": {} }
```

Never return a bare object, array, or non-standard shape.

### Step 7 — Error Handling in Routes

```javascript
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  if (error instanceof FeatureNotFoundError) {
    return reply
      .code(404)
      .send({ code: error.code, message: error.message, details: null });
  }
  return reply
    .code(500)
    .send({
      code: "INTERNAL_ERROR",
      message: "Unexpected error",
      details: null,
    });
});
```

Never use `console.log/error` — always use `request.log` (Fastify's structured logger).

### Step 8 — Co-located Tests (`.test.js`)

```javascript
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getFeature } from "./<feature>.service.js";

describe("getFeature", () => {
  it("returns the feature for a valid id", async () => {
    const result = await getFeature("valid-id");
    assert.equal(result.id, "valid-id");
  });

  it("throws FeatureNotFoundError for unknown id", async () => {
    await assert.rejects(() => getFeature("bad-id"), {
      name: "FeatureNotFoundError",
    });
  });
});
```

Test behaviour, not implementation. Never test private internals.

### Step 9 — Definition of Done (Node.js)

- [ ] Config read from startup config object — no scattered `process.env`
- [ ] Domain error subclass (not bare `Error`) thrown from business logic
- [ ] All responses follow `{ code, message, details }` shape
- [ ] No `console.log` — framework logger used
- [ ] `async`/`await` throughout — no unhandled rejections
- [ ] Co-located `.test.js` written
- [ ] Strong types / JSDoc on all exports

---

## Procedure (Go — `tools/sortronomy/**`)

### Step 1 — File Structure

```
<package>/
  <feature>.go        # Primary type and logic
  <feature>_test.go   # Co-located tests
```

One primary type per file. Lowercase package name. No `util` or `common` packages.

### Step 2 — Error Handling

```go
result, err := doSomething()
if err != nil {
    return fmt.Errorf("doSomething: %w", err)
}
```

Always `if err != nil`. Always wrap with context using `%w`.

### Step 3 — Context & Concurrency

```go
func FetchData(ctx context.Context, id string) (*Model, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    // ...
}
```

`context.Context` as first parameter. Always `defer cancel()`.

### Step 4 — Interfaces (at consumer side)

```go
// Defined in the consumer package, not the provider
type Fetcher interface {
    Fetch(ctx context.Context, id string) (*Model, error)
}
```

Keep interfaces small (1–3 methods).

### Step 5 — Logging

```go
slog.Info("fetching data", "id", id)
slog.Error("fetch failed", "id", id, "err", err)
```

Use `log/slog`. Never `fmt.Print*` in production code.

### Step 6 — Definition of Done (Go)

- [ ] `go build` passes
- [ ] `go vet` passes
- [ ] All `if err != nil` checks present
- [ ] Errors wrapped with `%w`
- [ ] GoDoc on all exported identifiers
- [ ] Co-located `*_test.go` written
