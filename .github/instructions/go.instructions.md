---
applyTo: "tools/astro-gen-go/**"
---

# Go Rules

## Error Handling

- Explicit `if err != nil` on every error \u2014 never swallow errors silently.
- Wrap errors with context: `fmt.Errorf("operation description: %w", err)`. Never return a bare `err` without context.
- Never use `panic` for recoverable errors \u2014 return errors explicitly.

## Interfaces & Abstractions (ISP + DIP)

- Define interfaces at the **consumer** side, not the producer side.
- Keep interfaces small \u2014 1\u20133 methods. If an interface grows beyond that, split it by consumer need.
- Accept interfaces, return concrete types.
- No global/package-level mutable state (`var cache = map[...]...{}`). Pass dependencies explicitly or inject via constructor functions.

## Concurrency

- Use `sync.WaitGroup` or channels for goroutine coordination. Avoid data races.
- Always pass `context.Context` as the first parameter on any blocking or I/O function.
- Cancel contexts promptly \u2014 always `defer cancel()` after `context.WithCancel` / `context.WithTimeout`.

## Package & File Organisation (SRP)

- Package names: lowercase, short, no underscores. Avoid `util`, `common`, `helpers` \u2014 they are SRP violations waiting to happen.
- One primary type or responsibility per file. File names use `snake_case.go`.
- Tests in `*_test.go` files, co-located with the source they test.
- Table-driven tests with `t.Run`.

## Code Quality

- Idiomatic Go. Prefer standard library over third-party packages.
- GoDoc comments on all exported identifiers.
- Use `log/slog` (stdlib, Go 1.21+) for structured logging. Never use `fmt.Println` for operational output.
- Prefer explicit field composition over anonymous struct embedding for clarity.
