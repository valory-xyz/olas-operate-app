---
name: review-implementation
description: Post-implementation self-review checklist. Use after completing a coding phase to audit imports, styling, design compliance, and test coverage before requesting human review.
---

**MANDATORY after each phase of a frontend feature.** CLAUDE.md requires this — see the "Workflow" section under Frontend Coding Conventions.

Fix ALL issues found — do not present code with known issues.

## 1. Global Sweep

When you fix an issue in one file, grep ALL other files you touched for the same pattern.
- "Did I make this same mistake in any other file in this feature?"

## 2. Import Audit

For **every** file you created or modified:
- [ ] Components exported from `frontend/components/ui/index.ts` are imported from `@/components/ui`, not from `antd`
- [ ] No hardcoded hex colors — all use `COLOR.*` from `@/constants`
- [ ] Import order follows `simple-import-sort`: external packages → `@/` aliases → relative paths

**Run `yarn lint:frontend` NOW. Fix all errors before continuing.**

## 3. Styling Audit

- [ ] No duplicated styles from existing `@/components/ui` components (e.g., don't recreate `SetupCard` styles as inline objects)
- [ ] SCSS utility classes used where available (`m-0`, `text-sm`, `text-center`) instead of inline styles
- [ ] `COLOR.*` constants used for all colors
- [ ] No inline style overrides on custom UI components that handle their own styling

## 4. Design Compliance

For every screen, compare against the design spec:
- [ ] All text matches **word-for-word** (not paraphrased)
- [ ] Heading levels match (`level={3}` vs `level={4}`)
- [ ] Input sizes match (default vs `size="small"` vs `size="large"`)
- [ ] Button types match (`type="primary"` vs `type="default"` vs `type="link"`)
- [ ] Card wrappers correct (`SetupCard`, `CardFlex`, two-card layout, etc.)
- [ ] Layout structure matches (borderless rows vs bordered cards, single vs stacked cards)
- [ ] Button widths match (`block` vs `alignSelf: flex-start`)

## 5. Test Coverage

- [ ] Tests exist for every new component, hook, and service in this phase
- [ ] Tests use factories from `frontend/tests/helpers/factories.ts` where possible
- [ ] `eslint-disable` blocks in test files have matching `eslint-enable`
- [ ] All tests pass: `yarn test:frontend -- --testPathPattern="<feature>"` — **run NOW**

## 6. Final Gate

All must pass before presenting for human review:
- [ ] `yarn lint:frontend` — 0 errors
- [ ] `yarn test:frontend -- --testPathPattern="<feature>"` — all pass
- [ ] No `eslint-disable` comments in source files (only in test files, paired)
- [ ] No files that duplicate existing patterns

**If any check fails, fix it before requesting review.**
