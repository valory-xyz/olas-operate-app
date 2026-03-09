# Feature Flags

## Overview

Feature flags control which UI capabilities are available per agent type. They are a static, compile-time configuration — not remotely toggled or fetched from an API. Each agent type has a complete set of flags that determines which parts of the UI are shown or hidden.

## Source of truth

- `frontend/hooks/useFeatureFlag.ts` — flag definitions (`FeatureFlagsSchema`), per-agent config (`FEATURES_CONFIG`), and the `useFeatureFlag` hook

## Contract / schema

`FEATURES_CONFIG` is a `Record<AgentMap, Record<FeatureFlags, boolean>>` validated at module parse time via Zod:

- `FeatureFlagsSchema` — `z.enum([...])` defining every valid flag name
- `FeaturesConfigSchema` — `z.record(z.nativeEnum(AgentMap), z.record(FeatureFlagsSchema, z.boolean()))` ensuring every agent has every flag

This means:
- Adding a new flag to the enum without adding it to every agent's config → Zod throws at import time
- Adding a new agent to `AgentMap` without a `FEATURES_CONFIG` entry → Zod throws at import time

The hook accepts a single flag (`string`) or an array of flags, and returns `boolean` or `boolean[]` accordingly.

## Runtime behavior

```
useFeatureFlag('withdraw-funds')
  → useServices().selectedAgentType   // e.g. AgentMap.Modius
  → FEATURES_CONFIG[AgentMap.Modius]  // agent's flag map
  → { 'withdraw-funds': true, ... }   // lookup result
  → true
```

1. Reads `selectedAgentType` from `useServices()`
2. Looks up the agent's flag map in `FEATURES_CONFIG`
3. Returns the boolean for the requested flag (or array of booleans for array input)
4. Falls back to `false` via `?? false` if a flag key is somehow missing from the map (defensive — Zod should prevent this)

## Failure / guard behavior

| Condition | Behavior |
|---|---|
| Module import when `FEATURES_CONFIG` is incomplete | Zod `.parse()` throws at module parse time — app won't start |
| `selectedAgentType` is `undefined` | `assertRequired` throws `"Feature Flag must be used within a ServicesProvider"` |
| Agent type exists in `AgentMap` but not in `FEATURES_CONFIG` | `assertRequired` throws `"Agent type {type} is not supported."` |
| Flag key missing from an agent's map | Returns `false` (nullish coalescing fallback) |

## Test-relevant notes

- The Zod validation runs at **import time** — tests that import `useFeatureFlag.ts` trigger validation. If `AgentMap` is mocked with agents not in `FEATURES_CONFIG`, the import itself will throw.
- `useServices` must be mocked to provide `selectedAgentType` — the hook throws without it.
- The `?? false` fallback is unreachable under normal Zod-validated config, but can be tested by bypassing Zod (e.g., manually setting `FEATURES_CONFIG` with a missing key).
- The hook is pure derivation — no side effects, no async, no state. Tests only need `renderHook` with a mocked `useServices`.
- **Used by:** Agent Wallet, Settings page, Setup page, Deposit flow.
