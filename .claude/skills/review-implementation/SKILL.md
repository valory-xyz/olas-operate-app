---
name: review-implementation
description: Post-implementation self-review checklist. Use after completing a coding phase to audit imports, styling, design compliance, and test coverage before requesting human review.
---

**MANDATORY after each phase of a frontend feature.** CLAUDE.md requires this — see "Workflow Commands" section.

Fix ALL issues found — do not present code with known issues.

## 1. Global Sweep

When you fix an issue in one file, grep ALL other files you touched for the same pattern.
- "Did I make this same mistake in any other file in this feature?"

## 2. Import Audit

For **every** file you created or modified:
- [ ] Components exported from `frontend/components/ui/index.ts` are imported from `@/components/ui`, not from `antd`
- [ ] No hardcoded hex colors — all use `COLOR.*` from `@/constants`
- [ ] Import order follows `simple-import-sort`: external packages → `@/` aliases → relative paths
- [ ] **Hooks live in `frontend/hooks/`, not `frontend/components/ui/`.** Even if a hook is tightly coupled to one component, it's not a component — placing it under `components/ui/` makes it auto-export from the UI barrel and discoverable from the wrong place.
- [ ] **Prefer barrel imports** (`@/constants`, `@/hooks`, `@/components/ui`, `@/types`) over deep paths (`../../../../constants/address`) unless the barrel triggers a circular import in tests. Be consistent within a single import block.
- [ ] **Touched-file violations:** if you added a line to a file that already violates a project rule (raw `antd` import, hardcoded hex, etc.), either fix it in scope (1–3 lines) or call it out in the PR description as out-of-scope follow-up — never silently leave it (see CLAUDE.md "Fix Globally, Not Locally → Touched-file ownership").

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

## 6. State Transition Audit

The most common bug class missed by single-frame tests: **state that persists across user actions** (TanStack `useMutation` error/data, TanStack `useQuery` error, custom flags) is not reset when the user dismisses an error and tries again via a different entrypoint.

For each error / loading / success state this PR introduces or modifies on a UI driven by `useMutation` or any other persistent state machine:

- [ ] **Map the state machine on paper** before reviewing the JSX. Enumerate every transition: `idle → pending`, `pending → success`, `pending → error`, `error → dismiss`, `error → retry`, `success → close`. The dismiss → retry edge is where bugs live.
- [ ] **List every user entrypoint that reaches the mutation.** If the component has a multi-step user flow (e.g. address → password → confirm), the entrypoint that opens the next step is **not** the entrypoint that fires `mutateAsync`. Walk that path explicitly: after dismissing an error, what does the next click render?
- [ ] **The dismiss handler must reset the mutation** (`mutation.reset()`) — and any other state the next attempt depends on (form inputs, navParams, derived flags). Stale error state will re-render the wrong modal on the next attempt.
- [ ] **There must be a test that fires the full sequence:** trigger → error → dismiss → re-trigger → assert the second attempt starts clean. Tests that only assert "given mutation in error state, X renders" are incomplete on their own — they cover the frame, not the transition.

**Asymmetry check:** if cases 1, 2, 3 of a feature look symmetric but each has a slightly different number of clicks before the mutation fires, the case with the most clicks-before-mutation is the bug. Walk those paths individually, don't generalise.

**Fail criterion:** if you can't point to a test that asserts the transition (not just the state), this audit isn't done. A fully green test suite is meaningless when the bug lives between frames.

## 7. Trust Boundary & Fallback Audit

For data crossing a trust boundary (network responses, navParams, localStorage, query strings):

- [ ] **Types narrow to *exactly* the contract,** not "what we'll tolerate". `prefill_amount_wei: number | string` is a lie if the backend always emits a string and a JSON-number value already lost precision at `JSON.parse` time. Wide types invite silent bugs upstream of your guard.
- [ ] **Type guards reject mismatched types** so the host falls through to its generic failure path. Don't accept a wider input than the contract.
- [ ] **Defensive fallbacks must render a complete, coherent UI** — not a half-rendered string with empty interpolation slots like `"at least 0.75  to cover gas fees"`. If a coherent fallback isn't possible (e.g. unknown chain → no native-token symbol → meaningless body copy), return `null` at the hook layer and let the host render its generic failure modal instead. Silent bad copy is worse than a fallback modal.
- [ ] **Test the malformed-response paths.** For each guard branch (`isInsufficientGasError`, `try/catch around asEvmChainId`, etc.), write a test that asserts the fallback behaviour, not just the happy path.

## 8. Restraint Audit

If a thing isn't earning its keep, delete it.

- [ ] **No reflexive `useMemo` / `useCallback`.** A 2-property dict lookup or a sync object destructure doesn't need memoization. Memoize only when (a) a downstream consumer threads the value through a dep array, (b) it's passed to a `React.memo`'d component, or (c) the computation is genuinely non-trivial. **Hook return values that callers spread into JSX should be memoized** — consumers may put them in a dep array and identity churn breaks them.
- [ ] **No comments that restate lint / type-system / framework invariants.** "Do not move", "load-bearing", "see Strict Mode docs", and similar warnings about hook ordering, rules-of-hooks, or `useState`/`useEffect` execution order are noise — lint catches these or they're framework-stable. Drop them.
- [ ] **Every type field, function param, and returned key has a runtime read site.** Grep for the field name before adding. If the only writer is a test factory, the field is dead — drop it from both the type and the factory.
- [ ] **Don't reuse a handler with state-specific side effects across sibling states.** If `handleClose` contains `if (isSuccess) onSuccess?.()`, don't bind it to the gas-error dismiss path — even if the success branch is currently a no-op when `isError`, the coupling is a future-bug trap. Split into per-state dismiss handlers.

## 9. Final Gate

All must pass before presenting for human review:
- [ ] `yarn lint:frontend` — 0 errors
- [ ] `yarn test:frontend -- --testPathPattern="<feature>"` — all pass
- [ ] No `eslint-disable` comments in source files (only in test files, paired)
- [ ] No files that duplicate existing patterns

**If any check fails, fix it before requesting review.**
