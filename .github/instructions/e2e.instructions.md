---
applyTo: "e2e/**"
---

# E2E / Playwright Rules

## Locators

- ONLY use `getByRole`, `getByText`, `getByLabel`, `getByPlaceholder`, `getByTestId`.
- NEVER use CSS selectors or XPath — they are brittle and couple tests to implementation.

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
