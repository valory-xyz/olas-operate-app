# Dynamic Polling

## Overview

Dynamic polling scales React Query refetch intervals based on window visibility. When the user is actively focused on the app, queries poll at their normal rate. When the window loses focus or is minimized, intervals are multiplied to reduce unnecessary API calls. This is a performance optimization — it does not change what data is fetched, only how often.

## Source of truth

- `frontend/hooks/useDynamicRefetchInterval.ts` — the `useDynamicRefetchInterval` hook and internal `useWindowVisibility` hook
- `frontend/constants/intervals.ts` — base interval constants (e.g., `FIVE_SECONDS_INTERVAL`, `THIRTY_SECONDS_INTERVAL`)

## Contract / schema

### Window states

```typescript
type WindowState = 'focused' | 'visible' | 'hidden';
```

- `focused` — user is actively interacting (window has focus)
- `visible` — window is on screen but not focused (e.g., behind another window)
- `hidden` — minimized or tab switched away (`document.hidden === true`)

### Multipliers

```typescript
const INTERVAL_MULTIPLIERS = {
  focused: 1,   // normal rate
  visible: 3,   // 3x slower
  hidden: 10,   // 10x slower
};
```

A 5-second base interval becomes 5s (focused), 15s (visible), or 50s (hidden).

### Input types

```typescript
type AdaptiveInterval =
  | number                                              // static interval in ms
  | false                                               // polling disabled
  | undefined                                           // polling disabled
  | ((...args: unknown[]) => number | false | undefined); // function-style (React Query pattern)
```

The hook preserves the input type — `useDynamicRefetchInterval(5000)` returns a `number`, `useDynamicRefetchInterval(fn)` returns a function with the same signature.

## Runtime behavior

### Window visibility detection (`useWindowVisibility`)

1. Initializes state as `'focused'`
2. On mount, immediately checks `document.hidden` and `document.hasFocus()` to set correct initial state
3. Registers three event listeners:
   - `document.visibilitychange` → checks `document.hidden` then `document.hasFocus()`
   - `window.focus` → sets `'focused'`
   - `window.blur` → checks `document.hidden` to distinguish `'visible'` from `'hidden'`
4. Cleans up all listeners on unmount

### Interval adjustment (`useDynamicRefetchInterval`)

The hook handles three input cases:

| Input | Output |
|---|---|
| `number` (e.g., `5000`) | `number * multiplier` (e.g., `5000`, `15000`, or `50000`) |
| `function` | Wrapped function that multiplies numeric results, passes through `false`/`undefined` |
| `false` / `undefined` | Returned as-is (polling disabled) |

The function-style case is used when React Query's `refetchInterval` callback needs query state to decide the interval — for example, returning `false` to stop polling after success, or a number to continue. The wrapper applies the multiplier only to numeric results.

### Integration pattern

Consumers wrap their base interval before passing to React Query:

```typescript
const refetchInterval = useDynamicRefetchInterval(FIVE_SECONDS_INTERVAL);

const { data } = useQuery({
  queryKey: ['services'],
  queryFn: fetchSomething,
  refetchInterval,  // 5s, 15s, or 50s depending on window state
});
```

### Consumers

Used across polling-heavy providers and hooks: `ServicesProvider`, `StakingContractDetailsProvider`, `BalancesAndRefillRequirementsProvider`, `useAgentRunning`, `useAgentStakingRewardsDetails`, `useStakingRewardsOf`.

## Failure / guard behavior

| Condition | Behavior |
|---|---|
| SSR (no `document`/`window`) | `useWindowVisibility` will throw — it accesses `document.hidden` and `document.hasFocus()` directly without SSR guards |
| `false` or `undefined` input | Returned as-is — no multiplication, polling stays disabled |
| Function input returns `false`/`undefined` | Wrapper passes through without multiplication — polling stays disabled for that cycle |
| Window regains focus after being hidden | State transitions back to `'focused'`, multiplier drops to 1 on next `useMemo` recomputation |

## Test-relevant notes

- **`useWindowVisibility` is internal** (not exported) — it can only be tested through `useDynamicRefetchInterval` or by testing event dispatch effects on the returned interval.
- **Event simulation:** Tests need to dispatch `visibilitychange`, `focus`, and `blur` events on `document`/`window`. `document.hidden` and `document.hasFocus()` may need to be mocked since jsdom doesn't fully support them.
- **No SSR guard:** Unlike `ElectronApiProvider`, this hook does not check `typeof window === 'undefined'`. In jsdom (Jest default), this is fine since `document` and `window` exist.
- **Multiplier is deterministic:** Given a window state and input, the output is always `input * multiplier`. No randomness, no async, no side effects beyond event listeners.
- **Function-style input:** When testing the function wrapper case, call the returned function and verify it multiplies numeric results but passes through `false`/`undefined` unchanged.
- **Cleanup:** The hook removes all three event listeners on unmount — testable by unmounting the hook and verifying listeners are removed or events no longer change the interval.
