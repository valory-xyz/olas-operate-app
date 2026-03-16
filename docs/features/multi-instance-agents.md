# Multi-Instance Agent Support — Implementation Plan

## Context

Pearl currently enforces a 1:1 relationship between agent type and service instance. Every lookup in the frontend assumes `AgentType` uniquely identifies a single running service. We need to support **multiple instances** of the same agent type — each with its own EOA, Safe, OLAS stake, staking slot, and independent lifecycle.

The backend already supports this (each instance gets a unique `service_config_id`). This is a **frontend-only change**.

### Core Paradigm Shift

**Before:** User selects `AgentType` → system derives THE single service <br/>
**After:** User selects a specific instance (`service_config_id`) → system derives the agent type from it

### Instance Behavior Summary

- Each instance has its own agent EOA, agent Safe, OLAS stake, and staking slot
- Each instance is independently startable, pausable, and removable
- Each instance has fully independent agent-level settings (strategy, goal, risk parameters)
- Instance names are auto-generated deterministically via `generateAgentName(chainId, tokenId)` (e.g., "fafon-norlo48")
- No frontend limit on instances per agent type (bounded only by staking slot availability)
- Instance creation uses the existing "Add New Agent" flow; already-owned agent types show "You own N" badge

---

## Step 1: Type & Persistence Changes

### 1a. `frontend/types/ElectronApi.ts`

- Add `lastSelectedServiceConfigId?: string` to `ElectronStore`
- Keep `lastSelectedAgentType` for backward compat only (used as fallback when `lastSelectedServiceConfigId` is missing after upgrade)
- **Remove `isInitialFunded` from Electron store** — replace with backend's `is_refill_required` per service. **[CONFIRM WITH TEAM]** that `is_refill_required` correctly distinguishes first-time funding vs refill scenarios.
- **`isProfileWarningDisplayed` becomes per instance** — move from `${agentType}.isProfileWarningDisplayed` to a new `instanceSettings` map keyed by `service_config_id`
- Extend `autoRun` type:
  ```
  includedInstances?: { serviceConfigId: string; order: number }[]
  userExcludedInstances?: string[]  // service_config_ids
  ```
  Keep existing `AgentType`-based fields alongside for backward compat.

### 1b. `electron/store.js`

- Add new fields to schema with defaults (`lastSelectedServiceConfigId: ''`, `instanceSettings: {}`, auto-run instance fields)

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

1. **`selectedServiceConfigId` becomes primary state** (initialized from `storeState?.lastSelectedServiceConfigId`, falling back to deriving from `lastSelectedAgentType` for migration)

2. **`selectedAgentType` becomes derived** via `useMemo`:
   ```ts
   const selectedAgentType = useMemo(() =>
     getAgentTypeFromService(selectedServiceConfigId), [selectedServiceConfigId, ...]);
   ```

3. **New `updateSelectedInstance(serviceConfigId)`** — sets `selectedServiceConfigId`, persists `lastSelectedServiceConfigId` to store

4. **`updateAgentType(agentType)` stays** but now selects the FIRST instance of that type internally (for sidebar parent-click and backward compat)

5. **Fix service-select effect (lines 329-344)** — if `selectedServiceConfigId` is already valid, keep it; only auto-select if no valid selection exists

6. **Fix `getAgentTypeFromService` (line 395)** — currently only checks `servicePublicId`, must also check `middlewareHomeChainId` to disambiguate Optimus/Modius (latent bug)

7. **New helpers to expose:**
   - `updateSelectedInstance: (serviceConfigId: string) => void`
   - `getInstancesOfType: (agentType: AgentType) => Service[]`
   - `instanceCountByAgentType: Record<AgentType, number>`

8. **`availableServiceConfigIds`** — already iterates all services, no change needed

9. **Define deterministic instance ordering** — `MiddlewareServiceResponse` has no `created_at` field. Sort instances by `service_config_id` (likely monotonically increasing) as a stable default. Define this sort once in a shared util and reuse across sidebar child order, auto-run rotation, migration, and selection fallback.

### Selection Restoration
On relaunch, `lastSelectedServiceConfigId` from the Electron store is used to restore the selected instance (agent type is derived from it). If `lastSelectedServiceConfigId` is missing (e.g., first launch after upgrade), falls back to `lastSelectedAgentType` and selects the first instance of that type.

---

## Step 3: Sidebar — Tree Structure

**File:** `frontend/components/MainPageV1/Sidebar/Sidebar.tsx`

### Changes:

1. **`myAgents` becomes grouped** — `Map<AgentType, { config: AgentConfig; instances: AgentInstance[] }>`

2. **Ant Design `Menu` renders as tree:**
   - Parent items: agent type icon + display name + instance count
   - Child items: generated instance name + status indicator (running dot / chain icon)
   - Use `Menu` with `children` sub-items or `type: 'group'`

3. **Selection key changes** from `[selectedAgentType]` to `[selectedServiceConfigId]`

4. **Click handling:**
   - Parent click: expand/collapse + select first child instance via `updateSelectedInstance(firstChild.serviceConfigId)`
   - Child click: `updateSelectedInstance(serviceConfigId)`

5. **Remove `canAddNewAgents`** — no longer needed since users can always add another instance. Always show the "Add Agent" button.

6. **Fallback selection** (lines 212-222): if selected instance not in myAgents, select first available instance (not first agent type)

---

## Step 4: New Instance Creation Flow

The instance creation flow is a **new multi-step flow**. It has up to 5 screens depending on Pearl wallet balance:

### Screen 1: Select Agent

**File:** `frontend/components/SetupPage/AgentOnboarding/SelectAgent.tsx` (major rework)

- Show ALL `ACTIVE_AGENTS` (remove `isNotInServices` filter)
- Add **"You own N"** badge per agent type using `instanceCountByAgentType`
- Right panel and "Select Agent" button remain unchanged

### Screen 2: Configure Activity Rewards (existing, redesigned)

Same as the current staking program selection — defaults to the agent's `defaultStakingProgramId`, user can change if they want. No functional change, just a UI refresh.

### Screen 3: Using Your Pearl Wallet Balance (NEW)

**New component** — intermediate balance-check screen. Applies to both multi-instance and existing flows (e.g., user already has Agents.fun on Base and is setting up PettBro on the same chain — the wallet may already have funds).

- Shows the Pearl wallet balances for only the tokens that appear in `refill_requirements`
- **If all required tokens are fully covered:** skip Screen 4, go directly to Screen 5 (Confirm Agent Funding)
- **If any token is missing or insufficient:** proceed to Screen 4 (Fund Your Agent) which requests the missing/shortfall amounts

### Screen 4: Fund Your Agent (existing, conditional)

Only shown when Pearl wallet balance is insufficient. This is the **existing** "Fund Your Agent" screen with payment method selection (Buy/Transfer/Bridge). The change to show `refill_requirements` instead of `total_requirements` applies to the existing flow as well, not just multi-instance (see Step 4a).

### Screen 5: Confirm Agent Funding (NEW)

**New component** — only shown when funds are being used from the Pearl wallet (i.e., wallet has sufficient balance and no manual funding is needed from the user).

- Shows the token amounts that will be transferred from the Pearl wallet + transaction fee estimate
- **"Confirm"** button triggers service creation and starts the agent
- After creation: `refetchServices` picks up new service → `updateSelectedInstance(newService.service_config_id)` selects the new instance
- **Not shown** when the user had to manually fund via Screen 4 (in that case the flow proceeds directly after funding)

### Step 4a: Update Existing "Fund Your Agent" Screen to Show Actual Shortfall

**This is a cross-cutting change that affects the existing flow too, not just multi-instance.**

The backend already returns both `total_requirements` and `refill_requirements` from `GET /api/v2/service/{id}/funding_requirements`. The `refill_requirements` field represents the actual shortfall (needed minus current balance). However, the existing "Fund Your Agent" screen currently displays `totalTokenRequirements` (mapped from `total_requirements`).

**Fix:** Switch `FundYourAgent.tsx` to display `refill_requirements` instead of `total_requirements`.

Files to update:
- `frontend/components/SetupPage/FundYourAgent/FundYourAgent.tsx` — change from `totalTokenRequirements` to refill-based amounts
- `frontend/hooks/useGetRefillRequirements.ts` — the hook already has access to both; just expose the refill data for display. Also: has `selectedAgentType` in a `useEffect` dependency that resets token requirements — must change to `selectedServiceConfigId`, otherwise switching between same-type instances won't trigger a reset
- The "Using Your Pearl Wallet Balance" and "Select Payment Method" screens in the new flow should also use `refill_requirements`

**Note:** For new instances, the "dummy service" pattern (created via `onDummyServiceCreation`) gives the service a `service_config_id` immediately, so the backend can compute `refill_requirements` even before the agent starts.

### Implementation Notes

- The 5-screen flow needs a new stepper/wizard component or extension of the existing setup flow state machine
- The current `SETUP_SCREEN` enum in `frontend/constants/pages.ts` will need new entries for these screens
- The balance-check → conditional branching (sufficient vs insufficient) is the key routing logic

---

## Step 5: useAgentRunning — Instance-Aware Running State

**File:** `frontend/hooks/useAgentRunning.ts`

### Changes:

1. **`runningServiceConfigId`** — derive directly from deployment data, not via `getServiceConfigIdFromAgentType` (which returns first match)

2. **`runningAgentType`** stays (derived from running service)

3. **`isAnotherAgentRunning`** — already compares by `service_config_id`, safe

---

## Step 6: Auto-Run — Instance-Level Rotation

Most complex subsystem change. Multiple files.

### 6a. `frontend/types/ElectronApi.ts` (already done in Step 1)

### 6b. `frontend/context/AutoRunProvider/hooks/useAutoRunStore.ts`
- Read/write `includedInstances` and `userExcludedInstances`
- Migration: convert existing `includedAgents` → `includedInstances` by resolving each agent type to its service(s)

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

All must become `Partial<Record<string /* service_config_id */, ...>>`. The `useAutoRunLifecycle.ts` hook reads/writes these same refs and must be updated accordingly (lines 28, 191-192, 273-277).

### 6g. Auto-Run UI — Per-Instance Exclusion

The auto-run control popover/context menu (currently in sidebar area) must change from a flat agent-type checkbox list to a **grouped tree of instance checkboxes**:

- Agent types as group headers (e.g., "Polystrat", "Omenstrat")
- Individual instances as checkbox items under each group (e.g., "corzim-vardor96", "tobin-vondor92")
- Each instance independently includable/excludable
- Stored as `userExcludedInstances: string[]` (`service_config_id`s) in Electron store

**File:** `frontend/components/MainPageV1/Sidebar/AutoRunControl.tsx` (or wherever the auto-run toggle/popover lives)

---

## Step 7: Balance, Staking & Funding — Instance-Level

### 7a. `frontend/context/BalancesAndRefillRequirementsProvider/`
- `isPearlWalletRefillRequired`: remove the `isInitialFunded` gate entirely — use the backend's `is_refill_required` flag per service instead. **[CONFIRM WITH TEAM]**

### 7b. `frontend/hooks/useAgentStakingRewardsDetails.ts`
- Use `selectedService` directly from `useServices()` instead of re-finding by `service_public_id`

### 7c. `frontend/hooks/useIsInitiallyFunded.ts`
- Remove this hook entirely — replace all usages with the backend's `is_refill_required` from `BalancesAndFundingRequirements`. **[CONFIRM WITH TEAM]**
- Clean up Electron store: remove the `${agentType}.isInitialFunded` keys

### 7d. `isProfileWarningDisplayed` — per instance
- `UnlockChatUiAlert.tsx:26` writes `${selectedAgentType}.isProfileWarningDisplayed` → change to `instanceSettings[serviceConfigId].isProfileWarningDisplayed`
- `Home/index.tsx:98` reads the same key → update accordingly
- `service_config_id` is globally unique (UUID-based), safe to use as sole key
- Migration: existing per-type flags can be ignored (users will see the warning once per instance)

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
3. **PR 3 — Creation Flow:** Step 4 (new 3-screen instance creation flow). Largest UI PR.
4. **PR 4 — Runtime:** Steps 5-6 (Running state + Auto-run). Complex but isolated.
5. **PR 5 — Cleanup:** Steps 7-8 (Balance, staking, remaining components).

---

## Estimated Scope

- **~35-40 files** modified
- **~2000-2500 lines** changed (additions + deletions)
- **4-5 new components** (Configure Activity Rewards, Pearl Wallet Balance check, Select Payment Method, Confirm Funding, auto-run instance popover)
- **1 existing screen updated** (Fund Your Agent — show actual shortfall, not total requirements)
- **No backend changes** needed
- **No breaking changes** for existing users (store migration handles backward compat)

---

## Key Risks & Gotchas

1. **Optimus/Modius share `service_public_id`** — `getAgentTypeFromService` must check BOTH `servicePublicId` AND `middlewareHomeChainId` (latent bug today, must fix in Step 2)

2. **`isInitialFunded` removal** — Replace with backend's `is_refill_required` per service. **[CONFIRM WITH TEAM]** that the backend flag correctly handles the first-time funding vs refill distinction. If not, a per-instance frontend flag will be needed.

3. **Auto-run migration** — Users with existing `includedAgents` (AgentType-based) must be migrated to `includedInstances` (serviceConfigId-based) on first load.

5. **Setup flow completion** — After creating a new instance, the new service must be explicitly selected via `updateSelectedInstance(newConfigId)`, not left to the auto-select logic (which would pick the first/existing instance).

---

## Verification

1. **Single-instance backward compat:** Existing user with one instance per type launches updated app → UI works identically, store migrates silently
2. **Create second instance:** Add Agent → select existing type → setup flow → new instance appears in sidebar as child
3. **Sidebar navigation:** Click parent = expand + select first child; click child = select that instance
4. **Auto-run:** Two instances of same type → both appear in rotation queue → each runs independently
5. **Funding:** New instance requires its own initial funding even if another instance of same type is funded
