---
applyTo: "tools/astrosolve/**"
---

# Python Rules

- Python 3.x only. Strict type hints on ALL function signatures.
  e.g. `def solve(image: bytes) -> Dict[str, Any]:`
- Use `dataclasses` or `pydantic` models over raw dicts for structured data.
- `async def` / `await` for all I/O-bound operations.
- Docstrings on all public functions.
- Tests via `pytest`; co-locate as `test_*.py` next to source files.
- Never use bare `except:` — always catch specific exception types.
