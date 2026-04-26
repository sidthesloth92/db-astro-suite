---
name: playwright-e2e
description: "Step-by-step workflow for writing Playwright E2E tests in db-astro-suite/e2e/**. Use when: writing new automation scripts, creating or updating Page Object Models, investigating a failing test, classifying a failure as a real bug vs an intentional feature change, or setting up visual regression tests. Covers POM pattern, semantic locator rules, test isolation, bug report format, and CI-only snapshot policy."
argument-hint: "Describe the user flow to test or the failing test to investigate."
---

# Playwright E2E Testing Workflow

## When to Use

- Writing a new Playwright spec for a critical user flow
- Creating or updating a Page Object Model in `e2e/pages/`
- Investigating a failing test after a feature change
- Classifying a failure: real bug or intentional change
- Setting up visual regression coverage

## Procedure

### Step 1 — Identify the User Flow

Focus on critical user journeys only. Skip flows already covered by unit or component tests.

Ask before writing anything:

- What does the user do?
- What is the expected observable outcome?
- Is this a **new flow** (needs new spec) or an **existing flow that changed** (needs spec update)?

### Step 2 — Check Existing Page Objects

Look in `e2e/pages/` before creating anything:

- If a Page Object exists for the page → extend it with new user-intent methods.
- If none exists → create one.

### Step 3 — Create / Update the Page Object

```typescript
// e2e/pages/<feature>.page.ts
import { Page } from '@playwright/test';

export class <Feature>Page {
  constructor(private readonly page: Page) {}

  async navigate() {
    await this.page.goto('/<route>');
  }

  async searchFor(query: string) {
    await this.page.getByRole('searchbox', { name: 'Search' }).fill(query);
    await this.page.getByRole('button', { name: 'Search' }).click();
  }

  async getResultCount(): Promise<number> {
    return this.page.getByRole('listitem').count();
  }
}
```

Page Objects expose **user-intent methods**. Never expose raw locators as properties.

### Step 4 — Allowed Locators (Non-Negotiable)

| Allowed              | Example                                        |
| -------------------- | ---------------------------------------------- |
| `getByRole()`        | `page.getByRole('button', { name: 'Submit' })` |
| `getByText()`        | `page.getByText('Orion Nebula')`               |
| `getByLabel()`       | `page.getByLabel('Right Ascension')`           |
| `getByPlaceholder()` | `page.getByPlaceholder('Search objects...')`   |
| `getByTestId()`      | `page.getByTestId('dso-card')`                 |

**NEVER**: CSS selectors (`.class`, `#id`), XPath (`//`), or `page.locator('div > span')`.

### Step 5 — Write the Test

```typescript
import { test, expect } from '@playwright/test';
import { <Feature>Page } from './pages/<feature>.page';

test.describe('<Feature>', () => {
  let featurePage: <Feature>Page;

  test.beforeEach(async ({ page }) => {
    featurePage = new <Feature>Page(page);
    await featurePage.navigate();
  });

  test('user can <action>', async () => {
    await featurePage.<action>();
    await expect(featurePage.page.getByRole('heading', { name: 'Result' })).toBeVisible();
  });
});
```

### Step 6 — Test Isolation Checklist

- [ ] Each test passes independently (no execution-order dependency)
- [ ] `test.beforeEach` handles all setup
- [ ] No shared mutable state between tests
- [ ] No reliance on a previous test's side effects

### Step 7 — Failure Classification (Bug vs Intentional Change)

When a test fails, **DO NOT immediately update it**. Classify first:

1. **Check**: does the commit message or developer context confirm an intentional behaviour change?
2. **If YES — intentional**: update the spec to reflect the new behaviour. This is acceptable.
3. **If NO — unexpected**: produce a Bug Report (see Step 8). Hand off to the correct developer.

This is the cardinal rule: never change a test just to make it green without understanding why it broke.

### Step 8 — Bug Report Format

```
## Bug Report

**Failing test**: `<spec file> — <test name>`
**Layer**: Frontend | Backend | Unknown
**Reproduction steps**:
1. ...
2. ...
**Expected**: ...
**Actual**: ...
**Suspected file(s)**: (optional)
```

Layer → handoff mapping:

- `Frontend` (rendering, navigation, forms) → `frontend-dev`
- `Backend` (API data, calculations, responses) → `backend-dev`
- `Unknown` → include both as candidates

### Step 9 — Visual Regression

- Snapshots generated in CI only: `pnpm e2e:update-snapshots` (Linux/Docker environment).
- **Never commit locally-generated snapshots.**
- Use `threshold` to handle cross-platform rendering variance:
  ```typescript
  await expect(page).toHaveScreenshot("feature.png", { threshold: 0.1 });
  ```
- Before accepting a snapshot diff — confirm it corresponds to an intentional UI change. If it does not, flag it as a bug.

### Step 10 — Definition of Done

- [ ] Page Object created or updated in `e2e/pages/`
- [ ] Only semantic locators used (no CSS selectors / XPath)
- [ ] Tests are fully isolated
- [ ] Does not duplicate unit / component test coverage
- [ ] No locally-generated snapshots committed
- [ ] Failure classified before any spec is modified
