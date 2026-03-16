# Multi-Instance Agent Support — Implementation Plan

## Context

Pearl currently enforces a 1:1 relationship between agent type and service instance. Every lookup in the frontend assumes `AgentType` uniquely identifies a single running service. We need to support **multiple instances** of the same agent type — each with its own EOA, Safe, OLAS stake, staking slot, and independent lifecycle.

The backend already supports this (each instance gets a unique `service_config_id`). This is a **frontend-only change**.

### Core Paradigm Shift

**Before:** User selects `AgentType` → system derives THE single service
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
- Keep `lastSelectedAgentType` for backward compat (migration reads old value)
- Add `instanceSettings?: Record<string, AgentSettings>` (keyed by `service_config_id`) for per-instance funded/warning state
- Extend `autoRun` type:
  ```
  includedInstances?: { serviceConfigId: string; order: number }[]
  userExcludedInstances?: string[]
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
  agentConfig: AgentConfig;
  name: string;           // from generateAgentName(chainId, tokenId)
  chainId: EvmChainId;
  tokenId?: number;
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

3. **New `updateSelectedInstance(serviceConfigId)`** — sets `selectedServiceConfigId`, persists both `lastSelectedServiceConfigId` and `lastSelectedAgentType` to store

4. **`updateAgentType(agentType)` stays** but now selects the FIRST instance of that type internally (for sidebar parent-click and backward compat)

5. **Fix service-select effect (lines 329-344)** — if `selectedServiceConfigId` is already valid, keep it; only auto-select if no valid selection exists

6. **Fix `getAgentTypeFromService` (line 395)** — currently only checks `servicePublicId`, must also check `middlewareHomeChainId` to disambiguate Optimus/Modius (latent bug)

7. **New helpers to expose:**
   - `updateSelectedInstance: (serviceConfigId: string) => void`
   - `getInstancesOfType: (agentType: AgentType) => Service[]`
   - `instanceCountByAgentType: Record<AgentType, number>`

8. **`availableServiceConfigIds`** — already iterates all services, no change needed

9. **Define deterministic instance ordering** — `MiddlewareServiceResponse` has no `created_at` field. Sort instances by `service_config_id` (likely monotonically increasing) as a stable default. Define this sort once in a shared util and reuse across sidebar child order, auto-run rotation, migration, and selection fallback.

### Backward Compatibility
On first launch after update: `lastSelectedServiceConfigId` is empty → provider reads `lastSelectedAgentType` → finds first service for that type → uses its `service_config_id` → writes to store.

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

5. **`canAddNewAgents`** — always `true` (can always add another instance)

6. **Fallback selection** (lines 212-222): if selected instance not in myAgents, select first available instance (not first agent type)

---

## Step 4: New Instance Creation Flow

The instance creation flow is a **new multi-step flow**, not a reuse of the existing setup flow. It has 4 screens:

### Screen 1: Select Agent (with tabs)

**File:** `frontend/components/SetupPage/AgentOnboarding/SelectAgent.tsx` (major rework)

#### "New agents" tab:
- Show ALL `ACTIVE_AGENTS` (remove `isNotInServices` filter)
- Add **"You own N"** badge per agent type using `instanceCountByAgentType`
- Right panel: agent details card with operating chain, minimum staking requirements (OLAS), minimum funding requirements (USDC + ETH), and "You can cover all requirements instantly with your card" note
- Pagination dots on the detail card (for agents with multiple chain variants?)
- "Select Agent" button proceeds to next screen

#### "Archived agents" tab (NEW):
- Lists stopped/removed instances by their generated name (e.g., "Mki-vondri")
- Right panel shows: agent type name, operating chain, **wallet balance** of the archived instance (OLAS, USDC, ETH)
- **"Restore Agent"** button to re-activate the instance (instead of "Select Agent")
- Implies instances are soft-deleted, not permanently removed — their service data persists in the backend

### Screen 2: Configure Activity Rewards (NEW)

**New component** — replaces the current "Select Staking Program" screen.

- Header: "Configure Activity Rewards" with agent icons
- Subtext: "You can earn OLAS crypto for using your agent. Configure ... select Staking Contract ... that suits ..."
- Shows **recommended configuration** card:
  - APR percentage (e.g., 130%)
  - OLAS activity reward amount (e.g., ~0.34 OLAS)
  - Required OLAS deposit (e.g., 1,000 OLAS)
- **"Change Configuration"** link to select a different staking contract
- **"Continue"** button proceeds to next screen

### Screen 3: Using Your Pearl Wallet Balance (NEW)

**New component** — intermediate balance-check screen.

- Header: "Using Your Pearl Wallet Balance" with agent icons
- Subtext: "Some of the required funds will be taken from your Pearl wallet. You'll need to deposit the remaining amounts in the next step."
- Shows **"From Pearl wallet"** card with current OLAS balance (e.g., 40.9855 OLAS)
- If balance is sufficient: proceed directly
- If balance is insufficient: **"Top up wallet"** button redirects to wallet top-up
- Proceeds to confirmation screen

### Screen 4: Confirm Agent Funding (NEW)

**New component** — final confirmation before agent starts.

- Header: "Confirm Agent Funding"
- Subtext: "Funds will be transferred from your Pearl wallet when the agent starts for the first time."
- Shows funding breakdown card:
  - From Pearl wallet: OLAS amount + ETH amount
  - Transaction fee estimate (e.g., "1 transaction fee on Optimism")
- **"Confirm"** button triggers service creation and starts the agent
- After creation: `refetchServices` picks up new service → `updateSelectedInstance(newService.service_config_id)` selects the new instance

### Implementation Notes

- The 4-screen flow needs a new stepper/wizard component or extension of the existing setup flow state machine
- The current `SETUP_SCREEN` enum in `frontend/constants/pages.ts` will need new entries for these screens
- The backend already returns ALL services including STOPPED (status 5) and DELETED (status 6) — no backend change needed for archived visibility. Frontend currently doesn't filter by deployment status. Use `MiddlewareDeploymentStatus.STOPPED` to identify archived instances. **Open question:** confirm that the balance endpoint returns balances for stopped services.
- The "Restore Agent" flow likely skips screens 2-3 (staking already configured, funds may already be present)

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
- `orderedIncludedAgentTypes` → `orderedIncludedConfigIds`
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

All must become `Partial<Record<string /* serviceConfigId */, ...>>`. The `useAutoRunLifecycle.ts` hook reads/writes these same refs and must be updated accordingly (lines 28, 191-192, 273-277).

---

## Step 7: Balance, Staking & Funding — Instance-Level

### 7a. `frontend/context/BalancesAndRefillRequirementsProvider/`
- `isPearlWalletRefillRequired`: check `instanceSettings?.[serviceConfigId]?.isInitialFunded` instead of `storeState?.[agentType]?.isInitialFunded`

### 7b. `frontend/hooks/useAgentStakingRewardsDetails.ts`
- Use `selectedService` directly from `useServices()` instead of re-finding by `service_public_id`

### 7c. `frontend/hooks/useIsInitiallyFunded.ts`
- Read/write `instanceSettings.{configId}.isInitialFunded` with fallback to per-type flag

### 7d. `isProfileWarningDisplayed` — also per-instance
- `UnlockChatUiAlert.tsx:26` writes `${selectedAgentType}.isProfileWarningDisplayed`
- `Home/index.tsx:98` reads the same key
- Both must use `instanceSettings.{configId}.isProfileWarningDisplayed` instead

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

These fire on agent-type change but won't fire when switching between instances of the **same** type:

| File | Line | What it does | Fix |
|------|------|-------------|-----|
| `Home/index.tsx` | 60 | `useEffect(() => setView('overview'), [selectedAgentType])` — resets tab to "Overview" | Add `selectedServiceConfigId` to deps |
| `Home/index.tsx` | 134 | `PageTransition key={selectedAgentType}` — remounts animation | Use `selectedServiceConfigId` as key |
| `useScrollPage.ts` | 14 | Scroll-to-top on `[pageState, selectedAgentType]` | Add `selectedServiceConfigId` to deps |

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
3. **PR 3 — Creation Flow:** Step 4 (new 4-screen instance creation + archived agents tab). Largest UI PR.
4. **PR 4 — Runtime:** Steps 5-6 (Running state + Auto-run). Complex but isolated.
5. **PR 5 — Cleanup:** Steps 7-8 (Balance, staking, remaining components).

---

## Estimated Scope

- **~32-35 files** modified (increased due to new creation flow screens)
- **~1500-2000 lines** changed (additions + deletions)
- **3-4 new components** for the instance creation flow (Configure Activity Rewards, Pearl Wallet Balance check, Confirm Funding, possibly Archived Agents tab)
- **No backend changes** needed
- **No breaking changes** for existing users (store migration handles backward compat)

---

## Key Risks & Gotchas

1. **Optimus/Modius share `service_public_id`** — `getAgentTypeFromService` must check BOTH `servicePublicId` AND `middlewareHomeChainId` (latent bug today, must fix in Step 2)

2. **`isInitialFunded` per instance** — New instance of an already-funded agent type must NOT inherit the type-level "funded" flag. The `instanceSettings` map solves this.

3. **Instance deletion** — If the selected instance is removed, selection must fall back to another instance of the same type, or the first available instance.

4. **Auto-run migration** — Users with existing `includedAgents` (AgentType-based) must be migrated to `includedInstances` (serviceConfigId-based) on first load.

5. **Setup flow completion** — After creating a new instance, the new service must be explicitly selected via `updateSelectedInstance(newConfigId)`, not left to the auto-select logic (which would pick the first/existing instance).

---

## Verification

1. **Single-instance backward compat:** Existing user with one instance per type launches updated app → UI works identically, store migrates silently
2. **Create second instance:** Add Agent → select existing type → setup flow → new instance appears in sidebar as child
3. **Sidebar navigation:** Click parent = expand + select first child; click child = select that instance
4. **Auto-run:** Two instances of same type → both appear in rotation queue → each runs independently
5. **Instance deletion:** Remove one instance → sidebar updates → selection falls back correctly
6. **Funding:** New instance requires its own initial funding even if another instance of same type is funded
