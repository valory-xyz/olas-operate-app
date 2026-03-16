# Staking & Rewards

## Overview

The staking system allows users to stake their agent's service NFT in on-chain staking programs and earn OLAS rewards. A service can be staked in exactly one program at a time. Rewards are distributed per epoch (typically 1 day) based on whether the service met a liveness threshold — measured by mech request counts or multisig nonce increments.

The system has four layers:

1. **On-chain contracts** — staking programs deployed on each supported chain, queried via ethers-multicall
2. **Subgraph** — GraphQL API for rewards history and active staking contract detection
3. **Context providers** — React contexts that poll on-chain and subgraph data, manage program selection, and derive reward state
4. **Consumer hooks** — focused accessors for contract details, eligibility, countdowns, streaks, and per-service rewards

```
On-chain contracts (multicall)
  └── StakingContractDetailsProvider (contract state + polling)
        ├── useActiveStakingContractDetails (eligibility + eviction)
        └── useStakingContractDetails (per-program slot/reward checks)

Subgraph (GraphQL)
  └── useRewardsHistory (checkpoints + streak + active contract)
        └── useActiveStakingProgramId (address → program ID)

StakingProgramProvider (program selection)
  └── useStakingProgram (metadata + available programs)
        └── useStakingContracts (ordered program list)

RewardProvider (rewards state)
  ├── useAgentStakingRewardsDetails (eligibility + accrued rewards)
  └── useAvailableRewardsForEpoch (epoch reward pool)

useStakingDetails (streak + epoch lifetime)
useStakingContractCountdown (minimum duration timer)
useStakingRewardsOf (multi-service rewards aggregation)
```

## Source of truth

- `frontend/config/stakingPrograms/index.ts` — `StakingProgramConfig` type, aggregated `STAKING_PROGRAMS` map
- `frontend/config/stakingPrograms/{gnosis,base,mode,optimism,polygon}.ts` — per-chain program definitions
- `frontend/constants/stakingProgram.ts` — `StakingProgramId` constants by chain
- `frontend/types/Autonolas.ts` — `StakingContractDetails`, `ServiceStakingDetails`, `StakingRewardsInfo`, `StakingState`
- `frontend/context/StakingProgramProvider.tsx` — active/default/selected program state
- `frontend/context/StakingContractDetailsProvider.tsx` — contract details caching + refetch logic
- `frontend/context/RewardProvider.tsx` — rewards state + optimistic calculation
- `frontend/hooks/useStakingProgram.ts` — program metadata (active, default, selected, all available)
- `frontend/hooks/useStakingContracts.ts` — ordered list of available programs (active first, deprecated filtered)
- `frontend/hooks/useStakingContractDetails.ts` — contract state for any program + active contract eligibility
- `frontend/hooks/useStakingContractCountdown.ts` — minimum staking duration countdown timer
- `frontend/hooks/useStakingDetails.ts` — reward streak + current epoch lifetime
- `frontend/hooks/useActiveStakingProgramId.ts` — subgraph-based active program detection
- `frontend/hooks/useStakingRewardsOf.ts` — multi-service rewards aggregation across a chain
- `frontend/hooks/useAgentStakingRewardsDetails.ts` — single-service rewards + eligibility query
- `frontend/hooks/useRewardsHistory.ts` — GraphQL subgraph query + epoch grouping + streak
- `frontend/utils/stakingProgram.ts` — `deriveStakingProgramId()` address normalization
- `frontend/utils/stakingRewards.ts` — `fetchAgentStakingRewardsInfo()` shared fetcher

## Contract / schema

### Staking program configuration

Each chain has a map of staking programs keyed by `StakingProgramId`. `StakingProgramConfig` is defined in `frontend/config/stakingPrograms/index.ts`, with per-chain definitions in `frontend/config/stakingPrograms/{gnosis,base,mode,optimism,polygon}.ts`. Programs are aggregated into `STAKING_PROGRAMS` keyed by chain ID.

Example program IDs: `pearl_beta_6` (Gnosis), `meme_base_beta` (Base), `modius_alpha` (Mode), `optimus_alpha_4` (Optimism), `polygon_beta_1` (Polygon).

### On-chain types

All defined in `frontend/types/Autonolas.ts`:

- `StakingContractDetails` — contract-level state (available rewards, max services, staking duration, APY, epoch info)
- `ServiceStakingDetails` — per-service state (staking start time, staking state)
- `StakingState` — enum: `NotStaked` (0), `Staked` (1), `Evicted` (2)
- `StakingRewardsInfo` — detailed rewards + eligibility for a service (Zod-validated). Key fields: `isEligibleForRewards`, `accruedServiceStakingRewards`, `tsCheckpoint` (hex → int via Zod transform)

### Subgraph schema

The subgraph is queried per service NFT token ID in `frontend/hooks/useRewardsHistory.ts`. The response is Zod-validated with `ServiceResponseSchema`. Returns `latestStakingContract` (address or null) and `rewardsHistory` with epoch, reward amounts (OLAS in wei), and checkpoint data.

Transformed into `Checkpoint` records (also in `useRewardsHistory.ts`). Key derived fields: `epochStartTimeStamp` (from previous epoch or `blockTimestamp - epochLength`), `reward` (OLAS formatted as ETH, 18 decimals), `earned` (true if `rewardAmount > 0`).

### Service object staking fields

Staking configuration is stored in the service object at `chain_configs[chain].chain_data.user_params`:

```json
{
  "staking_program_id": "polygon_beta_1",
  "use_staking": true,
  "use_mech_marketplace": false
}
```

### Context shapes

- `StakingProgramContext` — defined in `frontend/context/StakingProgramProvider.tsx`. Key fields: `activeStakingProgramId` (subgraph-derived, most authoritative), `defaultStakingProgramId` (from agent config), `selectedStakingProgramId` (resolved with fallback priority).
- `StakingContractDetailsContext` — defined in `frontend/context/StakingContractDetailsProvider.tsx`.
- `RewardContext` — defined in `frontend/context/RewardProvider.tsx`. Key field: `optimisticRewardsEarnedForEpoch` equals `availableRewardsForEpochEth` when eligible, otherwise undefined.

## Runtime behavior

### Program selection (StakingProgramProvider)

`selectedStakingProgramId` is resolved with a three-tier fallback:

1. **Subgraph value** — `activeStakingProgramId` from subgraph's `latestStakingContract`, mapped to a `StakingProgramId` via `serviceApi.getStakingProgramIdByAddress()`. Note: despite the name, this is subgraph-derived, not a direct on-chain query. The legacy on-chain multicall path (`createActiveStakingProgramIdQuery`) is only used by `useStakingRewardsOf` for multi-service scenarios.
2. **Service-stored value** — `chain_configs[homeChain].chain_data.user_params.staking_program_id` (used during migration before on-chain update)
3. **Default fallback** — `selectedAgentConfig.defaultStakingProgramId`

While loading, `selectedStakingProgramId` is null. `defaultStakingProgramId` resets when `selectedAgentConfig` changes.

### Contract details polling (StakingContractDetailsProvider)

Two polling strategies run concurrently:

| Query | Interval | Behavior |
|-------|----------|----------|
| All programs | 30s (dynamic) | Polls until success, then stops refetching for that program |
| Selected program | 5s (dynamic) | Continuous polling; includes `ServiceStakingDetails` if valid token ID |

Both intervals are scaled by `useDynamicRefetchInterval` based on window visibility. The selected program query is disabled when `isPaused` is true. `setIsPaused(true)` halts refetching during operations like unstaking.

The selected program query uses `Promise.allSettled` to merge `StakingContractDetails` and `ServiceStakingDetails` — either can fail without breaking the other.

### Rewards polling (RewardProvider)

Two parallel data streams:

| Query | Source | Interval | Guard |
|-------|--------|----------|-------|
| Staking rewards details | `fetchAgentStakingRewardsInfo()` (multicall) | 5s (dynamic) | online + serviceConfigId + stakingProgram + multisig + valid tokenId |
| Available rewards for epoch | `serviceApi.getAvailableRewardsForEpoch()` | 5s (fixed) | online + serviceConfigId + stakingProgram |

`optimisticRewardsEarnedForEpoch` equals `availableRewardsForEpochEth` when `isEligibleForRewards` is true, otherwise undefined.

On first staking reward achievement, `firstStakingRewardAchieved` is persisted to Electron store.

### Eligibility determination

Eligibility is determined on-chain by checking whether the service exceeded the activity threshold during the current epoch. Two methods exist depending on program configuration:

- **Mech-based** (programs with `mech` contract): counts new mech requests since last checkpoint
- **Nonce-based** (programs without `mech`): counts multisig nonce increments since last checkpoint

The required activity count is derived from: `(effectivePeriod * livenessRatio) / 1e18 + SAFETY_MARGIN`.

### Active contract eligibility (useActiveStakingContractDetails)

Derives several status flags from `selectedStakingContractDetails`:

- `isAgentEvicted` — `serviceStakingState === StakingState.Evicted`
- `isServiceStaked` — `serviceStakingStartTime > 0` and state is `Staked`
- `hasEnoughServiceSlots` — `serviceIds.length < maxNumServices` (null if data missing)
- `hasEnoughRewardsAndSlots` — rewards available AND slots available
- `isServiceStakedForMinimumDuration` — current time minus start time >= minimum duration
- `isEligibleForStaking` — `hasEnoughRewardsAndSlots` is non-nil (not necessarily true) AND (if evicted, minimum duration has passed). This means for non-evicted services, `isEligibleForStaking` can be `true` even when `hasEnoughRewardsAndSlots` is `false` — likely a bug

### Program ordering (useStakingContracts)

`orderedStakingProgramIds` is built by filtering and sorting available programs:

1. Skip deprecated programs
2. Skip programs that don't support the selected agent type
3. Place the active staking program first
4. Append remaining programs in original order

Returns empty array while `isActiveStakingProgramLoaded` is false.

### Reward streak (useRewardsHistory)

`latestRewardStreak` counts consecutive `earned: true` checkpoints from the most recent epoch backward. Stops at the first non-earned checkpoint.

### Optimistic streak (useStakingDetails)

Adds 1 to the subgraph streak if `isEligibleForRewards` is true (since the subgraph doesn't account for the current in-progress epoch).

`currentEpochLifetime` is calculated as `(tsCheckpoint + ONE_DAY_IN_S) * 1000` (in milliseconds).

### Countdown timer (useStakingContractCountdown)

Updates every 1 second via `useInterval`. Computes time remaining until the minimum staking duration has elapsed:

```
secondsUntilReady = minimumStakingDuration - (now - serviceStakingStartTime)
```

Clamps to 0 when negative. Returns `countdownDisplay` as a formatted string via `formatCountdownDisplay`.

### Multi-service rewards (useStakingRewardsOf)

Aggregates rewards across all services on a given chain:

1. Filters services matching the chain
2. For each service, queries `activeStakingProgramId` via `createActiveStakingProgramIdQuery` (multicall, not subgraph)
3. For each service + program pair, queries rewards via `createStakingRewardsQuery`
4. Sums `accruedServiceStakingRewards` across all successful queries

### Rewards history subgraph (useRewardsHistory)

Fetches all checkpoints for a service from the per-chain subgraph:

1. Queries with `serviceId` (NFT token ID as string)
2. Zod-validates the response with `ServiceResponseSchema`
3. Groups checkpoints by `contractAddress`
4. Transforms each into a `Checkpoint` with derived start/end timestamps
5. Sorts all checkpoints by `epochEndTimeStamp` descending
6. Refetches once per day (`ONE_DAY_IN_MS`)
7. Also refetches when `serviceNftTokenId` changes

Epoch start time derivation: for epoch 0 or when the previous checkpoint is missing, uses `blockTimestamp - epochLength`. Otherwise uses the previous checkpoint's `blockTimestamp`.

## Failure / guard behavior

- **Offline**: Reward queries (`useAgentStakingRewardsDetails`, `useAvailableRewardsForEpoch`) are disabled when `isOnline` is false. Contract detail queries (`StakingContractDetailsProvider`) do NOT check `isOnline` — they continue polling regardless of online status.
- **Paused**: Selected contract details query respects `isPaused` flag (used during staking operations)
- **Missing staking program**: If `selectedStakingProgramId` is null or doesn't exist in `STAKING_PROGRAMS`, reward queries return null
- **Invalid service token ID**: Queries guarded by `isValidServiceId(serviceNftTokenId)` — disables query if token is nil or <= 0
- **All programs query — stop on success**: Once a program's details are successfully fetched, that individual query stops refetching (`refetchInterval` returns `false` on success)
- **Contract detail merge failure**: `Promise.allSettled` allows contract details and service staking details to fail independently — partial data is still provided
- **Subgraph parse failure**: Logged to console, returns null (empty checkpoints)
- **Countdown guards**: Returns early if `serviceStakingStartTime` or `minimumStakingDuration` is nil
- **Eviction window**: Between eviction and minimum duration expiry, `isEligibleForStaking` is false — the service cannot be unstaked or re-staked during this window
- **Available rewards precedence bug**: `isRewardsAvailable` uses `availableRewards ?? 0 > 0` which due to operator precedence is equivalent to `availableRewards ?? (0 > 0)` — always truthy when `availableRewards` is defined (even if 0)

## Test-relevant notes

- No dedicated middleware API endpoints for staking — all staking data comes from on-chain multicall queries and subgraph GraphQL
- `StakingProgramProvider` is thin (no polling) — test `selectedStakingProgramId` fallback priority with different combinations of active/service/default values
- `StakingContractDetailsProvider` has two query strategies with different refetch behaviors — test the "stop on success" logic for all-programs vs continuous polling for selected program
- `useActiveStakingContractDetails` derives 6 boolean flags — test combinations of staking state, service slots, rewards, and eviction
- `isRewardsAvailable` has an operator precedence issue (`?? 0 > 0`) — test with `availableRewards = 0` to verify behavior
- `useRewardsHistory` epoch start derivation has edge cases: epoch 0, missing previous checkpoint, and normal consecutive epochs
- `latestRewardStreak` counts from most recent backward — test with gaps (earned, not-earned, earned) to verify it stops at first non-earned
- `useStakingContractCountdown` uses `useInterval(fn, 1000)` — mock with `jest.useFakeTimers()` or mock `usehooks-ts`
- `useStakingContracts` ordering depends on `isActiveStakingProgramLoaded` — returns empty array while false
- `useStakingRewardsOf` uses `createActiveStakingProgramIdQuery` (multicall-based) rather than `useActiveStakingProgramId` (subgraph-based) — different code paths for multi-service vs single-service
- `RewardProvider` persists `firstStakingRewardAchieved` to Electron store on first eligibility — mock `useElectronApi`
- `optimisticRewardsEarnedForEpoch` equals `availableRewardsForEpochEth` only when eligible — test both eligible and ineligible paths
- Subgraph URL is chain-specific via `REWARDS_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN` — mock `graphql-request`
