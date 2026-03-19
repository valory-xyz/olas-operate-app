# Multi-Instance Agent Support — Implementation Plan

## Context

Pearl currently enforces a 1:1 relationship between agent type and service instance. Every lookup in the frontend assumes `AgentType` uniquely identifies a single running service. We need to support **multiple instances** of the same agent type — each with its own EOA, Safe, OLAS stake, and independent lifecycle.

The backend already supports this (each instance gets a unique `service_config_id`). This is a **frontend-only change**.

### Core Paradigm Shift

**Before:** User selects `AgentType` → system derives THE single service <br/>
**After:** User selects a specific instance (`service_config_id`) → system derives the agent type from it

### Instance Behavior Summary

- Each instance has its own agent EOA, agent Safe, and OLAS stake
- Each instance is independently startable, and pausable.
- Instance names are auto-generated deterministically via `generateAgentName(chainId, tokenId)` (e.g., "fafon-norlo48")
- No frontend limit on instances per agent type
- Instance creation uses the existing "Add New Agent" flow; already-owned agent types show "You own N" badge

---

## Step 1: Type & Persistence Changes

### 1a. `frontend/types/ElectronApi.ts`

- Add `lastSelectedServiceConfigId?: string` to `ElectronStore`
- Keep `lastSelectedAgentType` for backward compat only — one-time migration in `ServicesProvider` converts it to `lastSelectedServiceConfigId` after services are first fetched
- **`isInitialFunded` becomes per service** — move from `${agentType}.isInitialFunded` to per `service_config_id`, e.g. `"optimus": {"isInitialFunded": {"sc-111": true, "sc-222": false}}`. Migration of existing boolean values handled in `ServicesProvider` after services are fetched (needs `service_config_id` from backend).
- **Remove `isProfileWarningDisplayed`** — confirmed no longer needed (all agents support x402). Remove the store keys and related code (`UnlockChatUiAlert.tsx`, `Home/index.tsx`).
- **Remove `firstRewardNotificationShown` and `agentEvictionAlertShown`** — unused in production code, only in type definitions.
- Extend `autoRun` type:
  ```
  includedAgentInstances?: { serviceConfigId: string; order: number }[]
  userExcludedAgentInstances?: string[]  // service_config_ids
  ```
  Keep existing `AgentType`-based fields alongside for backward compat.

### 1b. `electron/store.js`

- Add new fields to schema with defaults (`lastSelectedServiceConfigId: ''`, auto-run instance fields)
- `setupStoreIpc` only adds new schema fields with defaults

### 1c. Optional: `frontend/types/Instance.ts`

Convenience type used across sidebar, auto-run, wallet:
```ts
type AgentInstance = {
  serviceConfigId: string;
  agentType: AgentType;
  name: string;           // from generateAgentName(chainId, tokenId)
  tokenId?: number;       // NFT token ID from staking contract, used for name generation
};
```

---

## Step 2: ServicesProvider — Invert Selection Model

**File:** `frontend/context/ServicesProvider.tsx` — the highest-risk, highest-impact change.

### Changes:

1. **`selectedServiceConfigId` becomes primary state** (initialized from `storeState?.lastSelectedServiceConfigId`, with one-time migration from `lastSelectedAgentType` after first services fetch)

2. **`selectedAgentType` becomes derived** via `useMemo`:
   ```ts
   const selectedAgentType = useMemo(() =>
     getAgentTypeFromService(selectedServiceConfigId), [selectedServiceConfigId, ...]);
   ```

3. **New `updateSelectedInstance(serviceConfigId)`** — sets `selectedServiceConfigId`, persists `lastSelectedServiceConfigId` to store

4. **`updateAgentType(agentType)` stays** but now selects the FIRST instance of that type internally (for sidebar parent-click and backward compat). When no instances exist (setup flow for a new agent type), sets `pendingAgentType` instead — see point 10.

5. **Fix service-select effect** (the `useEffect` that sets `selectedServiceConfigId` when `selectedAgentConfig` or `services` change) — if `selectedServiceConfigId` is already valid, keep it; only auto-select if no valid selection exists. Skips entirely when `pendingAgentType` is set to avoid overwriting the setup flow's choice.

6. **Fix `getAgentTypeFromService`** — currently only checks `servicePublicId`, must also check `middlewareHomeChainId` to disambiguate Optimus/Modius (latent bug)

6a. **Extract shared service matcher** — the pattern `servicePublicId === service.service_public_id && middlewareHomeChainId === service.home_chain` is repeated across ~18 files. Extract into a shared util (e.g., `matchesAgentConfig(service, config)`). New code should use the matcher; existing usages can be refactored incrementally.

7. **New helpers to expose:**
   - `updateSelectedInstance: (serviceConfigId: string) => void` — clears `pendingAgentType`
   - `getInstancesOfAgentType: (agentType: AgentType) => MiddlewareServiceResponse[]`

8. **`availableServiceConfigIds`** — already iterates all services, no change needed

10. **`pendingAgentType` override** — during the setup flow, `updateAgentType` may be called for an agent type with no instances yet (e.g., user selects Polystrat but doesn't have one). Since `selectedServiceConfigId` can't resolve to the correct type, `pendingAgentType` bridges the gap:
    - Set by `updateAgentType` when no instances exist (also sets `selectedServiceConfigId` to `null`)
    - `selectedAgentType` derivation: `getAgentTypeFromService(configId) ?? pendingAgentType ?? PredictTrader`
    - Cleared by `updateSelectedInstance` (when a real instance is selected) or when leaving the Setup page
    - Service-select effect skips when `pendingAgentType` is set

9. **Define deterministic instance ordering** — `MiddlewareServiceResponse` has no `created_at` field. Raised with BE team to introduce one. Until then, use a stable default sort (e.g., lexicographic by `service_config_id`). Define this sort once in a shared util and reuse across sidebar child order, auto-run rotation, migration, and selection fallback.

### Selection Restoration & Migration
On relaunch, `lastSelectedServiceConfigId` from the Electron store is used to restore the selected instance. Both one-time migrations run in `ServicesProvider` after services are first fetched (both need `service_config_id` from backend):

1. **`lastSelectedServiceConfigId`** — if empty but `lastSelectedAgentType` exists, find the first matching service for that agent type and write its `service_config_id` to the store. After migration, `lastSelectedAgentType` is deleted from the store.
2. **`isInitialFunded`** — if still a per-type boolean, convert to per-service map by applying the existing value to the first service of that agent type.

After migration, the legacy keys are deleted and the migration paths never run again.

---

## Step 3: Sidebar — Tree Structure

**Files:** `frontend/components/MainPage/Sidebar/Sidebar.tsx`, `AgentTreeMenu.tsx`, `types.ts`

### Changes:

1. **`myAgents` becomes grouped** — `Map<AgentType, SidebarAgentGroup>` where `SidebarAgentGroup = { agentType, instances[] }`. Config is looked up via `AGENT_CONFIG[agentType]` (not stored in the group).

2. **Custom tree components** (Ant Design Menu's animation can't be disabled, so we use custom `GroupHeader`, `InstanceRow`, `TreeLine` styled components with Ant Design `Flex`/`Text` primitives):
   - Parent items: chevron (left) + agent type icon + display name
   - Child items: generated instance name + status indicator (running dot)
   - Tree connector line (`TreeLine`) on the left of expanded children
   - Chain icon moved to `AgentInfo` component (new `IconButton` styled component, consistent with info/settings buttons)
   - If a group is collapsed, the running dot is shown per group; if expanded, per instance (child)

3. **Selection key changes** from `[selectedAgentType]` to `[selectedServiceConfigId]`

4. **Click handling:**
   - Parent click (`onGroupSelect`): expand/collapse + select first child instance (no navigation)
   - Child click (`onInstanceSelect`): select instance + navigate if needed (fund page for unfunded, main for funded)

5. **Remove `canAddNewAgents`** — no longer needed since users can always add another instance. Always show the "Add Agent" button.

6. **Fallback selection** (`useEffect`): if selected instance not in any group, select first available instance

7. **Sidebar width** updated from 256px to 300px (per Figma)

8. **Scroll** — only the agent list area scrolls; header ("My agents" + auto-run toggle) and footer (Pearl Wallet, Help Center, Settings) are fixed

9. **Shared util** — `getServiceInstanceName(service, displayName, evmHomeChainId)` extracted to `utils/service.ts`, used by both `ServicesProvider` and the sidebar for consistent instance naming

---

## Step 4: New Instance Creation Flow

The instance creation flow reuses existing screens with extensions:

### Screen 1: Select Agent

**File:** `frontend/components/SetupPage/AgentOnboarding/SelectAgent.tsx` (major rework)

- Show ALL `ACTIVE_AGENTS` (remove `isNotInServices` filter)
- Add **"You own N"** badge per agent type using `getInstancesOfAgentType(type).length`
- Right panel and "Select Agent" button remain unchanged
- **Guard: undeployed instance exists** — If the user already has an instance of the selected agent type that was never deployed, do NOT create a new instance. Instead, select that undeployed instance via `updateSelectedInstance` and navigate the user back to the main page. This prevents orphaned instances from accumulating. Detection: use `getInstancesOfAgentType(type)` and check each instance's token ID via `isValidServiceId(tokenId)` — an instance with an invalid token ID (null, -1, or 0) has not been deployed yet. If any such instance exists, select the first one instead of creating a new instance.

### Screen 2: Configure Activity Rewards (existing, redesigned)

Same as the current staking program selection — defaults to the agent's `defaultStakingProgramId`, user can change if they want. No functional change, just a UI refresh.

### Screens 3-5: Funding Flow (separate setup screens)

Routing is handled by `resolveFundingRoute` in `SelectStakingButton`, which calls `BalanceService.getBalancesAndFundingRequirements` directly with the target service config ID and checks wallet balances:

- **`SETUP_SCREEN.ConfirmFunding`** — shown when `isRefillRequired === false && allowStartAgent === true` (wallet fully covers requirements). Shows token amounts from wallet. "Confirm" calls `setIsInitiallyFunded()` and navigates to main.

- **`SETUP_SCREEN.BalanceCheck`** — shown when wallet has funds on the chain (`walletBalances.some(b => b.balance > 0)`). Shows wallet contribution amounts via `useWalletContribution`. "Continue" navigates to `FundYourAgent`.

- **`SETUP_SCREEN.FundYourAgent`** — shown when wallet has no relevant funds. The existing Buy/Transfer/Bridge screen, now showing **actual shortfall** (`refillTokenRequirements`) not total requirements.

### Step 4a: Refill Requirements

- `useGetRefillRequirements` now exposes both `totalTokenRequirements` and `refillTokenRequirements`
- `FundYourAgent` cards show `refillTokenRequirements` (shortfall)
- `useTokensFundingStatus` uses `totalTokenRequirements` (for received/pending tracking on transfer screen)
- Bridge and OnRamp flows already used `refillRequirements` from the balance context
- `getRequirementsPerToken` returns `null` (not `[]`) when data isn't ready, preventing premature caching

### Shared components

- `RequiredTokenList` — reusable UI component for rendering token icon + amount + symbol list with skeleton loading
- `useWalletContribution` — shared hook computing `min(walletBalance, totalRequirement)` per token via `useTokensFundingStatus`

### Routing after staking selection

`SelectStakingButton.resolveFundingRoute` calls `BalanceService.getBalancesAndFundingRequirements` directly with the target service config ID (avoids the timing issue where `selectedService` hasn't propagated yet after `updateSelectedInstance`).

### Instance selection after dummy service creation

`onDummyServiceCreation` now returns the `MiddlewareServiceResponse` from the backend. All callers (`SelectStakingButton`, agent form components) follow this pattern:
1. `const newService = await onDummyServiceCreation(...)` — capture the response
2. `await refetchServices()` — ensure the new service is in the services list
3. `updateSelectedInstance(newService.service_config_id)` — select it (clears `pendingAgentType`, derivation works since service is now in the list)

---

## Step 5: useAgentRunning — Instance-Aware Running State (DONE in PR 3)

**File:** `frontend/hooks/useAgentRunning.ts`

### Changes:

1. **`runningServiceConfigId`** — now derived directly from deployment data in the same `useMemo` as `runningAgentType`, not via `getServiceConfigIdFromAgentType` (which returned the first match, causing the wrong instance to show the running dot)

2. **`runningAgentType`** stays (derived from running service)

3. **`isAnotherAgentRunning`** — already compares by `service_config_id`, safe

---

## Step 6: Auto-Run — Instance-Level Rotation

Most complex subsystem change. Multiple files.

### 6a. `frontend/types/ElectronApi.ts` (already done in Step 1)

### 6b. `frontend/context/AutoRunProvider/hooks/useAutoRunStore.ts`
- Read/write `includedAgentInstances` and `userExcludedAgentInstances`
- One-time migration after services are fetched: convert existing `includedAgents` → `includedAgentInstances` and `userExcludedAgents` → `userExcludedAgentInstances` by resolving each agent type to its service(s). Cannot run in `setupStoreIpc` — needs `service_config_id` from backend.

### 6c. `frontend/context/AutoRunProvider/utils/utils.ts`
- Add instance-level sorting/normalization helpers
- `getAgentFromServiceConfigId(configId, services)` — safer lookup

### 6d. `frontend/context/AutoRunProvider/AutoRunProvider.tsx`
- `orderedIncludedAgentTypes` → `orderedIncludedConfigIds` (keyed by `service_config_id`)
- Two instances of same type = two separate rotation entries

### 6e. `frontend/context/AutoRunProvider/hooks/useAutoRunController.ts`
- `updateAgentType` calls → `updateSelectedInstance` calls
- Scanner iterates instance configIds, not agent types

### 6f. Re-key all AgentType-keyed refs to `service_config_id` (CRITICAL)

The following refs use `Partial<Record<AgentType, ...>>` and will collapse multiple instances of the same type into one entry, causing incorrect skips, overwrites, and broken rotation:

| File | Ref | Purpose |
|------|-----|---------|
| `useAutoRunSignals.ts:71` | `rewardSnapshotRef` | Eligibility snapshots |
| `useAutoRunSignals.ts:75` | `lastRewardsEligibilityRef` | Previous rewards state tracking |
| `useAutoRunController.ts:149` | `stopRetryBackoffUntilRef` | Per-agent backoff after stop-timeout |
| `useAutoRunOperations.ts:86` | `skipNotifiedRef` | Skip notification dedup |
| `useAutoRunOperations.ts:87` | `lastRewardsFetchRef` | Rewards fetch throttling |

All must become `Partial<Record<string /* service_config_id */, ...>>`. The `useAutoRunLifecycle.ts` hook reads/writes these same refs (param types, reset guards during stop failure, eligibility transition tracking) and must be updated accordingly.

### 6g. Auto-Run UI — Per-Instance Exclusion

The auto-run control popover/context menu (currently in sidebar area) must change from a flat agent-type list to a **collapsible grouped tree** using Ant Design Tree component:

- Agent types as collapsible group headers (e.g., "Polystrat", "Omenstrat")
- Individual instances as tree items under each group (e.g., "corzim-vardor96", "tobin-vondor92")
- Each instance independently includable/excludable via tree selection
- **"Excluded from auto-run" section** — separated at the bottom of the popover under a divider, listing excluded instances grouped by agent type
- Stored as `userExcludedAgentInstances: string[]` (`service_config_id`s) in Electron store

**File:** `frontend/components/MainPage/Sidebar/AutoRunControl.tsx` (or wherever the auto-run toggle/popover lives)

---

## Step 7: Balance, Staking & Funding — Instance-Level

### 7a. `frontend/context/BalancesAndRefillRequirementsProvider/`
- `isPearlWalletRefillRequired`: change `isInitialFunded` lookup from `storeState?.[agentType]?.isInitialFunded` to the per-service structure `storeState?.[agentType]?.isInitialFunded?.[serviceConfigId]`

### 7b. `frontend/hooks/useAgentStakingRewardsDetails.ts`
- Use `selectedService` directly from `useServices()` instead of re-finding by `service_public_id`

### 7c. `frontend/hooks/useIsInitiallyFunded.ts`
- Update to read/write per `service_config_id`: `storeState?.[agentType]?.isInitialFunded?.[serviceConfigId]`
- For services not yet in the record, returns `false` (not `undefined`) — ensures "unfinished setup" alerts show correctly for new services
- Write: merges `{ [serviceConfigId]: true }` into the existing record, preserving other entries
- Migration: existing boolean `isInitialFunded: true` should be converted to apply to the first service of that agent type

### 7d. Remove `isProfileWarningDisplayed` entirely
- All agents now support x402 — this alert is no longer needed
- Remove store keys `${agentType}.isProfileWarningDisplayed`
- Remove related code in `UnlockChatUiAlert.tsx` and `Home/index.tsx`

---

## Step 8: Remaining Components — Mostly Safe

These files use patterns that already work with multi-instance or need only minor adjustments:

| File | Status |
|------|--------|
| `PearlWalletProvider.tsx` | **Safe** — already iterates all services |
| `SetupWelcome.tsx` | **Safe** — uses `.some()` not `.find()` |
| `SetupYourAgent.tsx` | **Safe** — looks up template by type (shared across instances) |
| `useStartService.ts` | **Safe** — template lookup by type is correct |
| `utils/service.ts` (`updateServiceIfNeeded`) | **Safe** — template lookup by type/name is correct |
| `useInitialFundingRequirements.ts` | **Safe** — template lookup by type |
| `SelectStakingButton.tsx` | **Minor** — after service creation, select new instance |
| `AchievementModal/index.tsx` | **Minor** — uses `getAgentTypeFromService` which we fix in Step 2 |

### Step 8a: UI state keys that must use `selectedServiceConfigId`

These fire on agent-type change but won't fire when switching between instances of the **same** type. Use `selectedServiceConfigId` as the key/dependency:

| File | Line | What it does | Fix |
|------|------|-------------|-----|
| `Home/index.tsx` | 60 | `useEffect(() => setView('overview'), [selectedAgentType])` — resets tab to "Overview" | Use `selectedServiceConfigId` in deps |
| `Home/index.tsx` | 134 | `PageTransition key={selectedAgentType}` — remounts animation | Use `selectedServiceConfigId` as key |
| `useScrollPage.ts` | 14 | Scroll-to-top on `[pageState, selectedAgentType]` | Use `selectedServiceConfigId` in deps |

### Step 8b: Notifications — per-instance format

Notification strings currently reference agent type only. Update to include instance name using `{AgentType} agent "{instanceName}"` format, e.g., `Polystrat agent "corzim-vardor96" was skipped`.

---

## Dependency Order & PR Strategy

```
Step 1 (Types & Store)
    │
    v
Step 2 (ServicesProvider) ─── everything depends on this
    │
    ├──> Step 3 (Sidebar)
    ├──> Step 4 (SelectAgent)
    ├──> Step 5 (useAgentRunning)
    │
    v
Step 6 (Auto-Run) ─── depends on Steps 2, 5
    │
    v
Step 7 (Balance/Staking) ─── depends on Step 2
    │
    v
Step 8 (Cleanup)
```

**Suggested PRs:**
1. **PR 1 — Foundation:** Steps 1-2 (types + ServicesProvider). Critical path.
2. **PR 2 — Sidebar:** Step 3 (tree structure with instances).
3. **PR 3 — Creation Flow:** Step 4 (SelectAgent rework + FundYourAgent multi-step extension). Largest UI PR.
4. **PR 4 — Runtime:** Steps 5-6 (Running state + Auto-run). Complex but isolated.
5. **PR 5 — Cleanup:** Steps 7-8 (Balance, staking, remaining components).

---

## Estimated Scope

- **~35-40 files** modified
- **~2000-2500 lines** changed (additions + deletions)
- **2-3 new sub-components** within FundYourAgent (balance check step, confirm funding step) + auto-run instance popover
- **1 existing screen updated** (Fund Your Agent — show actual shortfall, not total requirements)
- **No backend changes** needed
- **No breaking changes** for existing users (store migration handles backward compat)

---

## Key Risks & Gotchas

1. **Optimus/Modius share `service_public_id`** — `getAgentTypeFromService` must check BOTH `servicePublicId` AND `middlewareHomeChainId` (latent bug today, must fix in Step 2)

2. **`isInitialFunded` migration** — Moving from per-type boolean to per-service map. Existing `isInitialFunded: true` must be migrated to apply to the first service of that agent type.

3. **Auto-run migration** — Users with existing `includedAgents` (AgentType-based) must be migrated to `includedAgentInstances` (serviceConfigId-based) on first load.

4. **Setup flow completion** — After creating a new instance, the new service must be explicitly selected via `updateSelectedInstance(newConfigId)`, not left to the auto-select logic (which would pick the first/existing instance).

---

## Verification

1. **Single-instance backward compat:** Existing user with one instance per type launches updated app → UI works identically, store migrates silently
2. **Create second instance:** Add Agent → select existing type → setup flow → new instance appears in sidebar as child
3. **Sidebar navigation:** Click parent = expand + select first child; click child = select that instance
4. **Auto-run:** Two instances of same type → both appear in rotation queue → each runs independently
5. **Funding:** New instance requires its own initial funding even if another instance of same type is funded
