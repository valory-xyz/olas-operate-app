---
name: write-tests
description: Write frontend unit tests for business logic — hooks, context providers, services, utilities, and components. Use when the user asks to write tests, add test coverage, or test a specific hook/provider/service/component. Triggers on tasks involving testing, test coverage, unit tests, or test files.
argument-hint: [file-or-module-to-test]
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(cd frontend && npx jest *), Agent
---

# Frontend Test Writing Skill

You are an expert frontend engineer writing unit tests for the Pearl (olas-operate-app) codebase. You catch real bugs — not just pad coverage. You deeply understand the feature domain, how the business logic works, what utilities connect to which hooks, and how data flows through the system.

## Project test setup

- **Runner:** Jest 29 with `next/jest` and `jsdom` environment
- **Libraries:** `@testing-library/react`, `@testing-library/jest-dom`
- **Test root:** `frontend/tests/` (mirrors source structure)
- **Config:** `frontend/jest.config.ts`
  - roots: `['<rootDir>/tests']`
  - testMatch: `['<rootDir>/tests/**/*.test.{ts,tsx}']`
  - collectCoverageFrom: all `*.{ts,tsx}` files (excluding `*.d.ts`, test files, `.next/`, `node_modules/`)
- **Setup:** `frontend/jest.setup.ts` — imports `@testing-library/jest-dom`
- **Path aliases:** `@/*` maps to `frontend/*` (via tsconfig `baseUrl: "."`). For tests under `frontend/tests/`, **prefer relative imports** that mirror the source structure; using `@/*` in tests is allowed but should follow existing patterns within that test phase.
- **Run tests:** `cd frontend && npx jest` (or `yarn test` from frontend dir)
- **Run coverage:** `cd frontend && yarn test:coverage`

## Test plan reference

The full phased test plan lives at `frontend/tests/TEST_PLAN.md`. Always check which phase a file belongs to before writing tests — test files within a phase should be consistent in their mocking approach.

## File placement convention

Mirror the source path under `frontend/tests/`:

| Source | Test |
|--------|------|
| `hooks/useDeployability.ts` | `tests/hooks/useDeployability.test.ts` |
| `context/AutoRunProvider/hooks/useAutoRunScanner.ts` | `tests/context/AutoRunProvider/hooks/useAutoRunScanner.test.ts` |
| `service/agents/shared-services/StakedAgentService.ts` | `tests/service/agents/shared-services/StakedAgentService.test.ts` |
| `utils/numberFormatters.ts` | `tests/utils/numberFormatters.test.ts` |
| `components/Bridge/BridgeInProgress/useRetryBridge.ts` | `tests/components/Bridge/BridgeInProgress/useRetryBridge.test.ts` |

## Before writing any test

1. **Read the source file** completely — understand every branch, edge case, and dependency
2. **Read the feature doc** for the file's domain (see the "Feature documentation reference" table in `frontend/tests/TEST_PLAN.md`). Feature docs live in `docs/dev/features/` and describe runtime behavior, state transitions, failure modes, and test-relevant notes. For auto-run files, read `frontend/context/AutoRunProvider/docs/auto-run.md` instead.
3. **Follow cross-references** — if the feature doc delegates contract details to another doc (e.g., on-ramping.md references bridging.md and funding-and-refill.md for shared API shapes; deployability-and-lifecycle.md references services.md for stop/withdraw error behavior), read those referenced docs too. The delegated details affect mocking and assertions.
4. **Read the types/interfaces** it imports — know the shape of inputs and outputs
4. **Trace dependencies** — identify which hooks, contexts, or services it calls
5. **Read related constants/configs** if the logic references them (e.g., staking programs, chain configs, token configs)
6. **Check for existing tests** in `frontend/tests/` to maintain consistency
7. **Check the TEST_PLAN.md** to understand which phase the file belongs to and what else in that feature domain is being tested

## Feature domain awareness

When testing a file, understand which feature domain it belongs to. Tests should be written with awareness of the full feature flow:

- **Account & Wallet:** Account creation → wallet setup → safe creation → multisig → recovery. Includes `PearlWalletProvider`, `MasterWalletProvider`, `AccountRecovery` component hooks.
- **Balance & Services:** Balance fetching → aggregation → per-wallet/per-service selectors → availability checks. `ServicesProvider` is central to most features.
- **Staking & Rewards:** Program selection → contract details → eligibility → rewards calculation → countdown. Includes `ConfirmSwitch` and `SelectStakingPage` component hooks. Agent services (PredictTrader, Modius, etc.) extend `StakedAgentService`.
- **Funding & Refill:** Refill requirements → funding requests → bridge/on-ramp params → initial funding. Includes `SetupPage/FundYourAgent` component hooks.
- **Bridging & On-ramping:** Bridge requirements → execution → status polling → retry. On-ramp flow → payment steps → fiat conversion. All Bridge/OnRamp/PearlDeposit components are tested with their hooks.
- **Deployability & Lifecycle:** 14-branch eligibility check → service start → deployment workflow. Includes `UpdateAgentPage` and `AchievementModal` component hooks/context.
- **Auto-run:** Queue traversal → eligibility scanning → signals → start/stop operations → lifecycle management. Most complex subsystem — test utils first, then hooks bottom-up.

## How to write tests

### Pure logic / utility functions
- Import directly, call with various inputs, assert outputs
- Cover: normal cases, edge cases, boundary values, error/nullish inputs

### Hooks (pure derivation — no fetching)
- Use `renderHook` from `@testing-library/react`
- Mock context dependencies with a wrapper provider or by mocking the context hook
- Pattern:
```typescript
import { renderHook } from '@testing-library/react';

// Mock the dependency hooks
jest.mock('@/hooks/useSomeDependency', () => ({
  useSomeDependency: jest.fn(),
}));

import { useSomeDependency } from '@/hooks/useSomeDependency';
import { useHookUnderTest } from '@/hooks/useHookUnderTest';

const mockUseSomeDependency = useSomeDependency as jest.Mock;

describe('useHookUnderTest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns X when dependency provides Y', () => {
    mockUseSomeDependency.mockReturnValue({ data: 'Y' });
    const { result } = renderHook(() => useHookUnderTest());
    expect(result.current).toEqual(/* expected */);
  });
});
```

### Hooks with side effects (fetching, timers)
- Mock fetch/API calls at the service layer, not at `fetch` level
- Use `jest.useFakeTimers()` for timer-based logic
- Use `waitFor` from `@testing-library/react` for async state updates

### Context providers
- Render with a test component that consumes the context
- Mock the provider's own dependencies (other contexts, services)
- Test the derived state and callback behavior, not React rendering details

### Service files (API clients)
- Mock `fetch` or the underlying HTTP layer
- Test request construction (URL, headers, body)
- Test response parsing and error handling
- Test edge cases (network errors, malformed responses)

### Component business logic
- When a component has embedded hooks or complex logic, test the hooks independently where possible
- For components with business logic in render paths (conditional rendering, data transformations), test with React Testing Library
- Focus on: what gets rendered based on what state, callback behavior, error states
- Do NOT test: CSS classes, DOM nesting
- DO test static text content when it carries business meaning (e.g., error messages, status labels, user-facing copy that drives behavior)

## What to test (prioritize high-value assertions)

### DO test:
- **Decision logic:** if/else branches, eligibility checks, status derivations
- **Calculations:** token amounts, BigInt arithmetic, safety margins, APY
- **State transitions:** how state changes in response to different inputs
- **Edge cases:** empty arrays, zero balances, missing data, undefined fields, different data types for numbers (string / bigint)
- **Error paths:** what happens when dependencies return null/error states
- **Business rules:** staking eligibility, deployment preconditions, funding requirements
- **Async flows:** polling behavior, retry logic, abort/cancel handling
- **Cross-chain logic:** chain-specific behavior, address comparisons, token mappings, invalid chain

### DO NOT test:
- React rendering details (className, DOM structure)
- That React hooks work (useState updates, useEffect fires)
- Implementation details (internal variable names, call counts on non-critical mocks)
- Pure type files (no runtime code)
- Pure ABI exports (no logic)
- Static constant files (unless validating data shape integrity)

## Style rules

- Use `describe` blocks grouped by behavior, not by method name
- Test names should read as specifications: `it('returns canRun=false when balance is insufficient')`
- One logical assertion per test (multiple `expect`s are fine if testing one concept)
- Use `beforeEach` for shared setup, avoid deep nesting
- Prefer explicit mock values over shared fixtures — each test should be readable standalone
- Use TypeScript — no `any` unless absolutely necessary for mocking
- Use descriptive variable names — no `v0`, `v1`, `res`, `val`, etc. Names should convey what the value represents (e.g., `mockBalance`, `stakingProgramId`, `expectedReward`)
- Import from source using relative paths (e.g., `../../hooks/useDeployability`) since tests live under `tests/`

## Testing patterns (learned from PR reviews)

### Assertion precision
- **Use `toBe` over `toContain`/`toMatch` for exact value checks.** `expect(result).not.toContain('e')` is loose and could pass incorrectly.
- **Assert all relevant return properties**, not just the primary ones. When a function returns an object (e.g., `{ status, canProceed, shouldCreateSafe }`), test every business-relevant field, not just the "main" one.

### Coverage completeness
- **Test ALL variants, not just one.** When testing a mapping/conversion function (e.g., chain ID conversions), test ALL supported values (all chains). A test checking only Gnosis is incomplete.
- **Include edge cases:** zero values, equal values, very small/large values, rounding boundaries, case sensitivity for addresses.
- **Write negative tests.** Verify that functions DON'T do unwanted things. E.g., `expect(updatePayload).not.toHaveProperty('chain_configs')` ensures fields are excluded from partial updates.

### Avoid redundancy
- **Don't test what TypeScript already enforces.** If a config object's type requires certain fields, don't write tests asserting those fields exist — the compiler guarantees it.

### Use source constants, not hardcoded values
- **Reference config constants in tests**, not hardcoded strings. Instead of `'0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f'`, use `GNOSIS_TOKEN_CONFIG[TokenSymbolMap.OLAS].address`. Tests should break when config changes, not silently pass with stale data. If a config constant isn't exported, export it.
- **Use checksummed (EIP-55) addresses in test fixtures.** Real-world data uses mixed-case checksummed addresses, not all-lowercase. Use `'0xAbCDefAbCDefAbCDef...'` format in factories and mocks.

### Test naming and variables
- **Use descriptive variable names in assertions**, not inline expected values. 
- **Test names should describe behavior**, not implementation. 

## Backend API reference

When testing service files (`service/Account.ts`, `service/Wallet.ts`, `service/Services.ts`, `service/Balance.ts`, `service/Bridge.ts`, `service/Fund.ts`, etc.), consult the upstream middleware API docs at https://github.com/valory-xyz/olas-operate-middleware/blob/main/docs/api.md for:
- Correct endpoint URLs and HTTP methods
- Request body shapes for mocking
- Response shapes for assertions
- Error response formats and status codes
- Deployment status codes (1=not deployed, 3=running, 5=stopped)

## After writing tests

1. Run the specific test file: `cd frontend && npx jest tests/path/to/file.test.ts`
2. Fix any failures — if a test fails, read the error carefully and fix the test or identify a real bug
3. Run `cd frontend && yarn lint:fix` to auto-fix lint/formatting issues, then fix any remaining errors manually
4. Run `cd frontend && npx tsc --noEmit` to catch TypeScript errors (e.g., wrong type literals, missing properties). Never use `as never` or `as any` to silence type errors — use the correct types from source.
5. Run coverage: `cd frontend && npx jest --coverage tests/path/to/file.test.ts`
6. If unsure about business intent or expected behavior, **ask the user** before guessing

## Working with the user

- When business logic is ambiguous, ask the user to explain the expected behavior before writing assertions
- After completing a phase, run `yarn test:coverage` and share the coverage diff
- Each phase results in a separate PR — keep commits focused on the phase scope
