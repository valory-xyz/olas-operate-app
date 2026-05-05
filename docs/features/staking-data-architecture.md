# Staking Data Architecture

How staking contract and rewards data is fetched, what it is scoped to, and what is possible for cross-agent queries.

---

## Two data stores

`StakingContractDetailsProvider` (`frontend/context/StakingContractDetailsProvider.tsx`) maintains two separate stores:

### 1. `selectedStakingContractDetails` — selected agent only (5 s poll)

Fetches two endpoints in parallel:

- `serviceApi.getStakingContractDetails(stakingProgramId, evmHomeChainId)` — contract-level data (rewards pool, slot counts, APY)
- `serviceApi.getServiceStakingDetails(serviceNftTokenId, stakingProgramId, evmHomeChainId)` — service-specific data (staking state, eviction flag, start time)

Query key includes `serviceConfigId` → re-queries when the selected agent changes.

**Service-specific fields** (only available here, not in the map below):

| Field | Meaning |
|---|---|
| `serviceStakingState` | `NotStaked (0)`, `Staked (1)`, `Evicted (2)` |
| `serviceStakingStartTime` | Unix timestamp; 0 means never staked |
| `isAgentEvicted` | Derived: `state === Evicted` |
| `isServiceStaked` | Derived: `state === Staked` |
| `isEligibleForStaking` | Derived: minimum duration elapsed since eviction |
| `evictionExpiresAt` | `serviceStakingStartTime + minimumStakingDuration` |

### 2. `allStakingContractDetailsRecord` — all programs for selected agent type (30 s poll)

A `Record<StakingProgramId, Partial<StakingContractDetails>>` keyed by program ID. Fetches `getStakingContractDetails` for every program that supports the current agent type.

**Does NOT include `serviceNftTokenId`** — only contract-level data:

| Field | Meaning |
|---|---|
| `availableRewards` | OLAS in the epoch reward pool |
| `maxNumServices` | Total slots in the program |
| `serviceIds` | Services currently staked |
| `minStakingDeposit` | OLAS required to stake |
| `rewardsPerWorkPeriod` | Per-epoch reward share |
| `apy` | Annual percentage yield estimate |

---

## How the selected program is resolved

`StakingProgramProvider` (`frontend/context/StakingProgramProvider.tsx`) resolves `selectedStakingProgramId` in priority order:

1. **On-chain** — `useActiveStakingProgramId(selectedAgentConfig)` queries the selected agent's service on-chain via subgraph
2. **Service-stored** — `chain_configs[homeChain].chain_data.user_params.staking_program_id` from the backend service record
3. **Default fallback** — `selectedAgentConfig.defaultStakingProgramId`

All three derive from the selected agent. `selectedStakingProgramId` is `null` while loading.

---

## Program list filtering

`useStakingProgram` (`frontend/hooks/useStakingProgram.ts`) filters `STAKING_PROGRAMS[evmHomeChainId]` by `config.agentsSupported.includes(selectedAgentType)`.

Consequence: `allStakingContractDetailsRecord` only contains programs for the **currently selected agent type**. Switching from Optimus to Polystrat clears the map and re-fetches for the new agent's programs.

---

## Can staking data be fetched for a non-selected agent?

| Data type | Cross-agent fetch possible? | Reason |
|---|---|---|
| Contract-level (`availableRewards`, `serviceIds`) | ❌ No | `allStakingContractDetailsRecord` is filtered by `selectedAgentType`; another agent type's programs are not in the map |
| Service-specific (`isEvicted`, `stakingState`, `startTime`) | ❌ No | `useActiveStakingContractDetails()` reads only from `selectedStakingContractDetails`, which is bound to `selectedService` |
| Rewards info (`isEligibleForRewards`, `accruedRewards`) | ❌ No | `RewardProvider` and `useAgentStakingRewardsDetails` lock to `selectedService` + `selectedStakingProgramId` |

### The one escape hatch

`fetchAgentStakingRewardsInfo()` (`frontend/utils/stakingRewards.ts`) accepts all parameters explicitly:

```typescript
fetchAgentStakingRewardsInfo({
  chainId,
  stakingProgramId,
  multisig,
  serviceNftTokenId,
  agentConfig,
})
```

It has no coupling to the selected agent. AutoRun uses this directly during candidate scanning (in `autoRunHelpers.ts: refreshRewardsEligibility()`), passing each candidate's own data regardless of which agent is currently selected in the UI.

**To query another agent's rewards from UI code**, you would need to source that agent's `(serviceConfigId, multisig, serviceNftTokenId, agentConfig, stakingProgramId)` tuple from `useServices()` (which returns all services) and call this utility directly. No hook does this today.

---

## AutoRun's approach

AutoRun bypasses the provider layer entirely for cross-agent staking checks:

```
useAutoRunScanner
  └─ refreshRewardsEligibility(candidate)       ← autoRunHelpers.ts
       └─ fetchAgentStakingRewardsInfo({        ← stakingRewards.ts
            chainId:          candidate.chainId,
            stakingProgramId: candidate.stakingProgramId,
            multisig:         candidate.multisig,
            serviceNftTokenId: candidate.serviceNftTokenId,
            agentConfig:      candidate.agentConfig,
          })
```

Each candidate carries its own full data tuple. The UI's `selectedStakingProgramId` is irrelevant to AutoRun's scheduling decisions.
