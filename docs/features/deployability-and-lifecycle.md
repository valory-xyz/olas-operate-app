# Deployability & Service Lifecycle

## Overview

The deployability and lifecycle system determines whether an agent can be started, orchestrates the start sequence, and manages shared state. It sits at the top of the dependency chain — consuming data from services, balances, staking, wallets, and shared state to make a single "can this agent run?" decision.

The system has four layers:

1. **Deployability check** — `useDeployability` evaluates ~10 conditions to produce a `canRun` boolean with a reason string
2. **Service start** — `useStartService` handles safe creation, service creation/update, and starting the service (shared by manual and auto-run)
3. **Deployment workflow** — `useServiceDeployment` orchestrates the full manual start flow: polling control, status overrides, state refresh, and error handling
4. **Stop** — `stopDeployment` stops a running service

```
useServiceDeployment (manual start orchestration)
  ├── useDeployability (can the agent run?)
  │     ├── useOnlineStatusContext
  │     ├── useServices (selectedService, selectedAgentConfig)
  │     ├── useBalanceAndRefillRequirementsContext (allowStart, hasBalances)
  │     ├── useActiveStakingContractDetails (eviction, eligibility, slots)
  │     ├── useIsInitiallyFunded
  │     ├── useIsAgentGeoRestricted
  │     ├── useAgentRunning (isAnotherAgentRunning)
  │     └── useSharedContext (isAgentsFunFieldUpdateRequired)
  │
  ├── useStartService (shared start logic)
  │     ├── createSafeIfNeeded (safe eligibility + creation)
  │     ├── updateServiceIfNeeded (hash, env vars, fund requirements)
  │     └── ServicesService.startService / createService
  │
  └── polling control (pause/resume services, balances, staking)

SharedProvider (shared context)
  ├── isAgentsFunFieldUpdateRequired (env var check)
  ├── hasActiveRecoverySwap (recovery status)
  └── hasMainOlasBalanceAnimatedOnLoad (UI animation state)

SettingsService (backend config)
  └── getSettings → eoa_topups, eoa_thresholds
```

## Source of truth

- `frontend/hooks/useDeployability.ts` — deployability decision tree (~10 branches, returns `canRun` + `reason`)
- `frontend/hooks/useStartService.ts` — shared service start logic (safe creation, service create/update, start)
- `frontend/hooks/useServiceDeployment.ts` — manual deployment workflow (polling control, status overrides, error handling)
- `frontend/utils/service.ts` — `updateServiceIfNeeded` (hash, env vars, fund requirements, agent release comparison), `isValidServiceId`
- `frontend/utils/safe.ts` — `getSafeEligibility` (safe status derivation), `getSafeEligibilityMessage` (user-facing messages), `BACKUP_SIGNER_STATUS`
- `frontend/context/SharedProvider/SharedProvider.tsx` — shared context (AgentsFun field check, recovery status, OLAS balance animation)
- `frontend/hooks/useSharedContext.ts` — context accessor
- `frontend/service/Settings.ts` — settings API client (`getSettings`)

## Contract / schema

### Settings API (`SettingsService`)

`GET /api/settings`

```json
{
  "version": 1,
  "eoa_topups": {
    "gnosis": {
      "0xe2B4B0410f44aE3578E7A8Aa0C069eBfCC68E0A6": "30000000000000000000"
    }
  },
  "eoa_thresholds": {
    "gnosis": {
      "0xe2B4B0410f44aE3578E7A8Aa0C069eBfCC68E0A6": "5000000000000000000"
    }
  }
}
```

`eoa_topups` and `eoa_thresholds` are keyed by `SupportedMiddlewareChain`, then by EOA address, with wei-string values. Accepts `AbortSignal`. Throws `Error('Failed to fetch settings')` on non-ok response.

### Deployability result shape

Defined as `DeployabilityResult` in `frontend/hooks/useDeployability.ts`. Fields: `isLoading`, `canRun`, `reason` (why `canRun` is false, e.g., `'Low balance'`, `'Evicted'`), `loadingReason` (comma-separated loading sources).

### SharedProvider context shape

Defined in `frontend/context/SharedProvider/SharedProvider.tsx`.

### Service update checks (`updateServiceIfNeeded`)

When starting a service, `updateServiceIfNeeded` compares the existing service against its `SERVICE_TEMPLATE` and patches any drifts:

| Check | Condition | Patch |
|---|---|---|
| Hash | `service.hash !== template.hash` | Update hash |
| Name | AgentsFun only: `service.name !== template.name` | Update name |
| Description | Missing `[Pearl service]` prefix | Prepend prefix |
| Env variables | New FIXED/COMPUTED vars in template, or FIXED value changed | Add/update vars |
| Fund requirements | Any agent/safe amount differs from template | Replace all fund requirements |
| Agent release | `service.agent_release` differs | Update release |
| Staking program | `updatedStakingProgramId` provided | Update program ID |

Skips the API call entirely if no changes detected (`isEmpty(partialServiceTemplate)`).

## Runtime behavior

### Deployability decision tree (`useDeployability`)

The hook evaluates conditions in priority order. The first failing condition determines the result:

```
1. safeEligibility.ok === false (and not loading)
   → canRun: false, reason: safeEligibility.reason

2. Any dependency still loading
   → canRun: false, reason: 'Loading', loadingReason: 'Services, Balances, ...'

3. selectedAgentConfig.isUnderConstruction
   → canRun: false, reason: 'Under construction'

4. isGeoLocationRestricted && isAgentGeoRestricted
   → canRun: false, reason: 'Region restricted'

5. isAnotherAgentRunning
   → canRun: false, reason: 'Another agent running'

6. hasEnoughServiceSlots === false && !isServiceStaked
   → canRun: false, reason: 'No available slots'

7. isAgentEvicted && !isEligibleForStaking
   → canRun: false, reason: 'Evicted'

8. isAgentsFunFieldUpdateRequired
   → canRun: false, reason: 'Update required'

9. isInitialFunded === false
   → canRun: false, reason: 'Unfinished setup'

10. !canStartSelectedAgent (from refill requirements)
    → canRun: false, reason: 'Low balance'

11. All checks pass
    → canRun: true
```

**Loading sources** checked (in order): Offline, Services, Balances (3 sub-checks: not enabled, loading, or no balances for selected agent), Staking, Geo, Safe, Setup (`isInitialFunded === undefined`).

The `safeEligibility` parameter is optional. Currently only auto-run's `useSelectedEligibility` passes it — `useServiceDeployment` calls `useDeployability()` with no argument, so manual deployment is **not** pre-blocked by safe eligibility at this level (safe eligibility is instead checked inside `createSafeIfNeeded` during the start flow). When provided, it's checked first, even before loading state.

### Service start flow (`useStartService`)

Shared by both manual start (`useServiceDeployment`) and auto-run:

```
1. createSafeIfNeeded()
   ├── getSafeEligibility() → check if safe exists on home chain
   ├── If HasSafe → return (no-op)
   ├── If !canProceed → show error message, redirect to Settings, throw
   └── If Ready → WalletService.createSafe(chain, backupOwner)

2. If service exists:
   ├── updateServiceIfNeeded(service, agentType)
   └── ServicesService.startService(service.service_config_id)

3. If no service and createServiceIfMissing:
   ├── Find SERVICE_TEMPLATE for agentType (throw if missing)
   ├── Find STAKING_PROGRAM for chain + programId (throw if missing)
   ├── ServicesService.createService({ stakingProgramId, serviceTemplate, useMechMarketplace })
   └── ServicesService.startService(newService.service_config_id)

4. If no service and !createServiceIfMissing:
   └── throw Error('Service not found for agent: {agentType}')
```

`useStartService` always creates the safe first (step 1) before any service operations.

### Manual deployment workflow (`useServiceDeployment`)

Orchestrates the full user-initiated start:

```
handleStart()
  │
  ├── Guard: return early if no masterWallets[0]
  ├── Guard: throw if no selectedStakingProgramId
  │
  ├── pauseAllPolling()
  │     ├── setIsServicePollingPaused(true)
  │     ├── setIsBalancePollingPaused(true)
  │     └── setIsStakingContractInfoPollingPaused(true)
  │
  ├── overrideSelectedServiceStatus(DEPLOYING)
  │
  ├── startService({ ... createServiceIfMissing: true })
  │     ├── On error:
  │     │     ├── showNotification('An error occurred...')
  │     │     ├── overrideSelectedServiceStatus(null)
  │     │     ├── resumeAllPolling()
  │     │     └── re-throw
  │
  ├── updateStatesSequentially()
  │     ├── updateServicesState()
  │     ├── refetchActiveStakingContractDetails()
  │     └── updateBalances()
  │     (errors logged but don't abort flow)
  │
  ├── overrideSelectedServiceStatus(DEPLOYED)
  ├── resumeAllPolling()
  ├── delayInSeconds(5)
  └── overrideSelectedServiceStatus(null)  // clear override after 5s
```

**Status override sequence**: `DEPLOYING` → (start completes) → `DEPLOYED` → (5s delay) → `null` (backend status takes over). This prevents UI flickering during the transition.

**`isDeployable`** combines `useDeployability().canRun` with a local `isLoading` check (services loading OR service already running OR staking contract details not loaded).

**`isLoading`** in this hook is broader than `useDeployability`'s — it also checks `isServiceRunning` and `isAllStakingContractDetailsRecordLoaded`.

### Stop flow

This flow reuses the service/deployment API surface documented in `docs/features/services.md`. In this doc, the relevant lifecycle actions are when `stopDeployment()` and `withdrawBalance()` are invoked from UI flows.

### AgentsFun field update check (SharedProvider)

For `AgentsFun` agent type only, the provider checks whether five required Twitter API environment variables have values in the selected service's `env_variables`:

- `TWEEPY_CONSUMER_API_KEY`
- `TWEEPY_CONSUMER_API_KEY_SECRET`
- `TWEEPY_BEARER_TOKEN`
- `TWEEPY_ACCESS_TOKEN`
- `TWEEPY_ACCESS_TOKEN_SECRET`

If any are empty/missing, `isAgentsFunFieldUpdateRequired` is `true`, which blocks deployment via `useDeployability` (reason: `'Update required'`).

For all other agent types, `isAgentsFunFieldUpdateRequired` is always `false`.

### Recovery status check (SharedProvider)

On mount, SharedProvider queries recovery status once (via React Query with `staleTime: Infinity`, no refetch) and maps `has_swaps` to `hasActiveRecoverySwap`. This only runs when online. The recovery endpoint and response schema are documented in `docs/features/account.md`.

## Failure / guard behavior

- **useDeployability** — returns `canRun: false` with a specific `reason` string for each failure. The `isLoading` flag is true when any of 7 data sources hasn't resolved. When `isLoading` is true, `canRun` is always false (loading is treated as blocking).
- **useDeployability safe check** — `safeEligibility` is checked first, even before loading state. If `safeEligibility.ok` is false and not loading, deployment is blocked immediately regardless of other conditions.
- **useDeployability slot check** — uses `!isNil(hasEnoughServiceSlots)` guard, so `null`/`undefined` slots (not yet loaded) don't trigger the "No available slots" rejection.
- **useStartService** — throws `Error` when: service not found and `createServiceIfMissing` is false; `stakingProgramId` is missing; service template not found; staking program not found for chain.
- **useStartService safe creation** — if safe eligibility fails (`!canProceed`), shows an `antd` error message, navigates to Settings page, and throws. The user must fix safe configuration before retrying.
- **useServiceDeployment** — on start error: shows notification, clears status override, resumes polling, and re-throws. State refresh errors after successful start are logged but don't throw.
- **useServiceDeployment early return** — `handleStart` returns early (no-op) if `masterWallets[0]` is falsy. Throws if `selectedStakingProgramId` is missing.
- **useServiceDeployment status override** — override is set to `DEPLOYING` immediately, then `DEPLOYED` after start succeeds, then cleared after 5 seconds. On error, override is cleared immediately.
- **updateServiceIfNeeded** — returns early (no API call) if no template found for the agent type, or if no fields have drifted.
- **SettingsService** — throws `Error('Failed to fetch settings')` on non-ok response. Accepts `AbortSignal`.
- **SharedProvider AgentsFun check** — only runs for `AgentsFun` agent type. For all others, `isAgentsFunFieldUpdateRequired` is immediately set to `false`. Returns early if `selectedService` is undefined.
- **SharedProvider recovery query** — runs once on mount with `staleTime: Infinity`. Does not refetch on window focus, reconnect, or remount. Only fires when online.

## Test-relevant notes

- `useDeployability` has ~10 prioritized branches — test each in isolation by mocking all dependencies. Priority order matters: safe eligibility blocks before loading, loading blocks before all runtime checks.
- `useDeployability` loading sources — test each of the 7 loading conditions independently. The `loadingReason` string is comma-separated and reflects which sources are still loading.
- `useDeployability` balance loading has 3 sub-checks: `!isBalancesAndFundingRequirementsEnabledForAllServices`, `isBalancesAndFundingRequirementsLoadingForAllServices`, and `!hasSelectedAgentBalances`. All three produce `'Balances'` in `loadingReason`.
- `useDeployability` slot check — verify the `!isNil(hasEnoughServiceSlots)` guard: `undefined` should NOT trigger "No available slots", but `false` should (when not staked).
- `useDeployability` geo check — only blocks when BOTH `isGeoLocationRestricted` AND `isAgentGeoRestricted` are true.
- `useStartService` — test the three paths: existing service (update + start), new service (create + start), no service without `createServiceIfMissing` (throws).
- `useStartService` — verify `createSafeIfNeeded` is always called first, before any service operations.
- `useServiceDeployment` — test the polling pause/resume lifecycle: all three polling systems are paused before start and resumed after.
- `useServiceDeployment` — test the status override sequence: DEPLOYING → DEPLOYED → null (after 5s). On error: DEPLOYING → null (immediate).
- `useServiceDeployment.isLoading` — differs from `useDeployability.isLoading`: also checks `isServiceRunning` and `isAllStakingContractDetailsRecordLoaded`.
- `updateServiceIfNeeded` — test each comparison independently: hash, name (AgentsFun only), description prefix, env vars (new FIXED/COMPUTED, updated FIXED), fund requirements, agent release. Test that no API call is made when nothing changed.
- `SharedProvider` AgentsFun check — test with all 5 env vars present (false), one missing (true), non-AgentsFun agent (always false), and `selectedService` undefined (no-op).
- `SharedProvider` recovery query — mock `RecoveryService.getRecoveryStatus`, verify it fires once, and test `has_swaps` → `hasActiveRecoverySwap` mapping.
- `SettingsService` — mock `fetch`, test request URL and headers, test ok and error responses.
- `isValidServiceId` — test with valid numbers, 0, -1, null, undefined.
