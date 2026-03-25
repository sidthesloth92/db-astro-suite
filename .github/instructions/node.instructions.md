---
applyTo: "tools/astrosolve/**"
---

# Node.js / ESM Rules

## Modules & Imports

- ESM only (`import`/`export`). No CommonJS (`require`/`module.exports`).
- ALL imports at the top of the file — never mid-file.
- `async/await` for all I/O-bound operations. Never block the event loop with synchronous I/O inside an `async` function.

## Error Handling

- Throw domain-specific error subclasses (e.g. `class AstrometryError extends Error`) from services. Never throw a plain `new Error('...')` — it forces fragile string-matching at the catch site.
- Domain error classes live in a dedicated `errors.js` module — never defined inline in route or service files.
- Never use bare `catch {}` — always catch specific exception types or re-throw.
- Never swallow errors silently. Either re-raise, log, or convert to a typed error response.

## Logging

- Use the framework's structured logger (Fastify's `request.log` or `fastify.log`). Never use `console.log`, `console.error`, or `console.warn` in production code.
- Log at the appropriate level: `debug` for diagnostics, `info` for lifecycle events, `warn` for recoverable issues, `error` for failures.

## Configuration

- Read ALL environment variables once at startup into a validated, frozen config object (`config.js`). Never scatter `process.env.X` reads across service or route files.

## SRP & Code Organisation

- One primary class or responsibility per module. If a module does more than one thing, split it.
- JSDoc docstrings on all exported functions and classes.

## File Naming Conventions

| Content                        | File suffix             |
| ------------------------------ | ----------------------- |
| Services (business logic)      | `*.service.js`          |
| Routes / controllers           | `*.route.js`            |
| Domain error classes           | `errors.js`             |
| Config / startup               | `*.config.js`           |
| Utility functions              | `*.util.js`             |
| Domain / DTO models            | `*.model.js`            |
| Constants                      | `*.constants.js`        |

- Never co-locate model classes, constants, or error definitions inside service or route files.
- One concept per file.

## API Contract

All responses must follow this shape:

```json
{ "code": "string", "message": "string", "details": {} }
```

- Services map responses to typed domain models before returning them.
- No ambiguous or loosely typed API responses.

## Testing

- Tests co-located as `*.test.js` next to the source files they test.
- Test behaviour via inputs and outputs — not internal implementation details.
