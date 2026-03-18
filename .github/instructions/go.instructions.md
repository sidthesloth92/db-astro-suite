---
applyTo: "tools/astro-gen-go/**"
---

# Go Rules

- Idiomatic Go. Prefer standard library over third-party packages.
- Explicit `if err != nil` on every error — never swallow errors silently.
- Use `sync.WaitGroup` or channels for goroutine coordination. Avoid data races.
- `context.Context` as first parameter on any blocking or I/O function.
- Table-driven tests with `t.Run`. GoDoc comments on all exported identifiers.
- Never use `panic` for recoverable errors — return errors explicitly.
