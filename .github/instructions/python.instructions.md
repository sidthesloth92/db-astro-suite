---
applyTo: "tools/astrosolve/**"
---

# Python Rules

## Types & Data Modelling

- Python 3.x only. Strict type hints on ALL function signatures.
  e.g. `def solve(image: bytes) -> dict[str, Any]:`
- Use `dataclasses` or `pydantic` models over raw dicts for structured data.
- Value objects (data-only models) should use `@dataclass(frozen=True)` to enforce immutability.
- Use `typing.Protocol` to define abstractions at the consumer side (DIP). Avoid coupling to concrete implementations via direct imports.
- Constants live in a dedicated `*_constants.py` module at `UPPER_SNAKE_CASE` names \u2014 never inline in service or route files.

## Async & I/O

- `async def` / `await` for all I/O-bound operations.
- Never block the event loop with synchronous I/O inside an `async` function.

## Error Handling

- Never use bare `except:` \u2014 always catch specific exception types.
- Never swallow exceptions silently. Either re-raise, log, or convert to a typed error response.

## Logging

- Use the `logging` module for all operational output. Never use `print()` in production code.
- Log at the appropriate level: `DEBUG` for diagnostics, `INFO` for lifecycle events, `WARNING` for recoverable issues, `ERROR` for failures.

## SRP & Code Organisation

- One primary class or responsibility per module. If a module does more than one thing, split it.
- Docstrings on all public functions and classes.
- Declare a module's public API explicitly via `__all__` where the module is imported as a library.

## Testing

- Tests via `pytest`; co-locate as `test_*.py` next to the source files they test.
- Test behaviour via inputs and outputs \u2014 not internal implementation details.
