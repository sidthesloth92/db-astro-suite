---
applyTo: "e2e/**"
---

# E2E / Playwright Rules

## Locators

- ONLY use `getByRole`, `getByText`, `getByLabel`, `getByPlaceholder`, `getByTestId`.
- NEVER use CSS selectors or XPath — they are brittle and couple tests to implementation.

## Page Object Model

- Every distinct page or major feature area must have a Page Object class in `e2e/pages/`.
- Page Objects expose user-intent methods (`fillForm()`, `submitSolve()`) — not raw locators.
- If a page's UI changes, update the Page Object only — not every test that uses it.

## Test Structure & Isolation

- Every test must be fully independent — no shared state, no execution-order dependencies.
- Use Playwright's `page` fixture (function scope) to guarantee a clean context per test.
- `describe` blocks map to pages or features. `test`/`it` descriptions read as user behaviour sentences: `'should show an error when no image is uploaded'`.
- Pre-conditions must be set programmatically (API calls or fixtures), not by running other tests first.

## Scope

- E2E tests cover critical user flows only.
- Do NOT duplicate logic already covered by unit or component tests.
- Keep tests deterministic — no time-dependent assertions without explicit waits.

## Visual Regression

- Snapshots MUST be generated in CI (Linux/Docker). Never commit locally-generated snapshots.
- Update baselines: `pnpm e2e:update-snapshots` in CI only.
- Use the `threshold` option on `toMatchSnapshot` to account for cross-platform rendering variance.
- **Test integrity:** Review snapshot diffs before accepting them. Never blindly accept snapshot
  changes — a changed snapshot means the UI changed, which requires intentional sign-off.

## Test Integrity

- If a test fails after a code change, determine whether the **behaviour changed intentionally**.
  - If YES → update the test to reflect the new intended behaviour.
  - If NO → fix the code. Do NOT modify the test to make it pass.
