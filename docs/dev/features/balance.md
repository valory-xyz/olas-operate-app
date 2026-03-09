# Balance

## Overview

The balance system tracks token holdings across all wallets (master EOA, master safes, agent safes, agent EOAs) and all supported chains. It has two distinct data sources:

1. **On-chain wallet balances** — native and ERC20 token balances fetched directly from RPC providers via ethers/multicall
2. **Funding requirements** — per-chain balance/refill data fetched from the middleware API (`/funding_requirements`)

These feed into different providers and hooks. The on-chain balances power the `BalanceProvider` (what tokens you *have*), while funding requirements power the `BalancesAndRefillRequirementsProvider` (what tokens you *need*). Consumer hooks derive UI-ready balance views: `useMasterBalances` combines on-chain balances with refill requirements, `useAvailableAssets` adds staking rewards to on-chain balances, while `useServiceBalances` and `useAvailableAgentAssets` are purely on-chain balance selectors.

```
BalanceService (middleware API)
  └── BalancesAndRefillRequirementsProvider (refill requirements)

On-chain RPC (ethers + multicall)
  └── BalanceProvider (wallet balances + staked balances)
        ├── useMasterBalances (master EOA + safe balances)
        ├── useServiceBalances (agent safe + EOA balances)
        ├── useAvailableAssets (master wallet available assets)
        └── useAvailableAgentAssets (agent wallet available assets)
```

## Source of truth

- `frontend/service/Balance.ts` — middleware API client for funding requirements
- `frontend/context/BalanceProvider/BalanceProvider.tsx` — on-chain balance state + polling
- `frontend/context/BalanceProvider/utils.ts` — cross-chain balance fetching (wallet balances + staked balances)
- `frontend/hooks/useBalanceContext.ts` — context accessor for `BalanceProvider`
- `frontend/hooks/useBalanceAndRefillRequirementsContext.ts` — context accessor for `BalancesAndRefillRequirementsProvider`
- `frontend/hooks/useMasterBalances.ts` — master wallet balance selectors (EOA + safe, native + OLAS + ERC20)
- `frontend/hooks/useServiceBalances.ts` — service wallet balance selectors (safe + EOA per service)
- `frontend/hooks/useAvailableAssets.ts` — available master wallet assets for a chain (includes staking rewards)
- `frontend/hooks/useAvailableAgentAssets.ts` — available agent wallet assets (filtered by agent's `erc20Tokens` config)
- `frontend/types/Balance.ts` — `WalletBalance`, `CrossChainStakedBalances`
- `frontend/types/Funding.ts` — `BalancesAndFundingRequirements`, `AddressBalanceRecord`, etc.
- `frontend/constants/serviceRegistryL2ServiceState.ts` — on-chain service state enum (used for staked balance correction)
- `frontend/context/BalancesAndRefillRequirementsProvider/BalancesAndRefillRequirementsProvider.tsx` — refill requirements state (consumed by `useMasterBalances`)
- `frontend/hooks/useStakingRewardsOf.ts` — staking rewards aggregation (consumed by `useAvailableAssets`)

## Contract / schema

### Balance API (`BalanceService`)

| Method | HTTP | Endpoint | Body | Returns |
|---|---|---|---|---|
| `getBalancesAndFundingRequirements` | GET | `/v2/service/{serviceConfigId}/funding_requirements` | — | `BalancesAndFundingRequirements` |
| `getAllBalancesAndFundingRequirements` | GET | (parallel calls per service) | — | `Record<string, BalancesAndFundingRequirements>` |

Both accept `AbortSignal` for cancellation. `getAllBalancesAndFundingRequirements` uses `Promise.allSettled` — failed individual fetches are silently dropped (via `compact`), so the result may be a partial map.

### Example: `getBalancesAndFundingRequirements` response

```json
{
  "balances": {
    "gnosis": {
      "0xE97C17124cd1CD95300E2bE3e207C4B8162A535C": {
        "0x0000000000000000000000000000000000000000": "1000000000000000000",
        "0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f": "5000000000000000000"
      }
    }
  },
  "total_requirements": {
    "gnosis": {
      "0xE97C17124cd1CD95300E2bE3e207C4B8162A535C": {
        "0x0000000000000000000000000000000000000000": "500000000000000000"
      }
    }
  },
  "refill_requirements": {
    "gnosis": {
      "0xE97C17124cd1CD95300E2bE3e207C4B8162A535C": {
        "0x0000000000000000000000000000000000000000": "0"
      }
    }
  },
  "agent_funding_requests": {
    "gnosis": {
      "0x1234567890abcdef1234567890abcdef12345678": {
        "0x0000000000000000000000000000000000000000": "100000000000000000"
      }
    }
  },
  "protocol_asset_requirements": {
    "gnosis": {
      "0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f": "10000000000000000000"
    }
  },
  "bonded_assets": {
    "gnosis": {
      "0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f": "10000000000000000000"
    }
  },
  "is_refill_required": false,
  "allow_start_agent": true,
  "agent_funding_in_progress": false,
  "agent_funding_requests_cooldown": false
}
```

All balance values are wei strings. `0x000...000` represents the native gas token. Token addresses like `0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f` are OLAS on Gnosis.

### BalancesAndFundingRequirements type

```typescript
type BalancesAndFundingRequirements = {
  balances: Partial<{ [chain in MiddlewareChain]: AddressBalanceRecord }>;
  refill_requirements: Partial<{ [chain in MiddlewareChain]: AddressBalanceRecord | MasterSafeBalanceRecord }>;
  total_requirements: { [chain in MiddlewareChain]: AddressBalanceRecord | MasterSafeBalanceRecord };
  agent_funding_requests: Partial<{ [chain in MiddlewareChain]: AddressBalanceRecord | ServiceSafeBalanceRecord }>;
  protocol_asset_requirements: Partial<{ [chain in MiddlewareChain]: TokenBalanceRecord }>;
  bonded_assets: Partial<{ [chain in MiddlewareChain]: TokenBalanceRecord }>;
  is_refill_required: boolean;
  allow_start_agent: boolean;
  agent_funding_in_progress: boolean;
  agent_funding_requests_cooldown: boolean;
};
```

Note: `refill_requirements` and `total_requirements` can contain either `AddressBalanceRecord` (keyed by wallet address) or `MasterSafeBalanceRecord` (keyed by literal `"master_safe"`). Similarly, `agent_funding_requests` can use `ServiceSafeBalanceRecord` (keyed by `"service_safe"`).

### WalletBalance type (on-chain)

```typescript
type WalletBalance = {
  walletAddress: Address;
  evmChainId: EvmChainId;
  symbol: TokenSymbol;
  isNative: boolean;
  balance: number;          // deprecated — loses precision
  balanceString?: string;   // formatted string preserving precision
  isWrappedToken?: boolean;
};
```

### CrossChainStakedBalances type (on-chain)

```typescript
type CrossChainStakedBalances = Array<{
  serviceId: string;
  evmChainId: number;
  olasBondBalance: number;
  olasDepositBalance: number;
  walletAddress: Address;
}>;
```

### Service state → staked balance correction

Staked balances (bond + deposit) are corrected based on the on-chain service state:

| Service State | Bond | Deposit |
|---|---|---|
| `NonExistent` (0) | 0 | 0 |
| `PreRegistration` (1) | 0 | 0 |
| `ActiveRegistration` (2) | 0 | actual |
| `FinishedRegistration` (3) | actual | actual |
| `Deployed` (4) | actual | actual |
| `TerminatedBonded` (5) | actual | 0 |
| default (invalid) | actual | actual |

## Runtime behavior

### BalanceProvider

Polls on-chain balances every 15 seconds via React Query. Enabled only when `isOnline && !!masterWallets?.length && !!services` are all truthy. Note: `!!services` passes for an empty array — the query runs even with zero services as long as `services` is not `null`/`undefined`.

The core query calls `getCrossChainBalances`, which runs two operations in parallel via `Promise.allSettled`:

1. **`getCrossChainWalletBalances`** — iterates all configured chains (from `providers`), fetches native balances via `provider.getBalance` and ERC20/wrapped balances via multicall `balanceOf`. EOAs are queried on every chain; Safes only on their own chain.

2. **`getCrossChainStakedBalances`** — for each service, looks up the on-chain service registry (bond, deposit, state) via `StakedAgentService.getServiceRegistryInfo` using multicall. Skips services with nil/invalid token IDs or missing master safe addresses. Results are corrected by `correctBondDepositByServiceState`.

Derived values exposed:
- `walletBalances` — flat array of all `WalletBalance` entries
- `stakedBalances` — flat array of `CrossChainStakedBalances`
- `totalEthBalance` — sum of all native token balances across wallets
- `totalOlasBalance` — sum of all OLAS balances across wallets
- `totalStakedOlasBalance` — bond + deposit for the selected agent's home chain
- `getStakedOlasBalanceOf(walletAddress)` — bond + deposit for a specific wallet (uses `areAddressesEqual`)
- `isLoaded` — `!!data` (truthy once first fetch completes)
- `isPaused` / `setIsPaused` — pause/resume polling (sets `refetchInterval` to `false`)
- `updateBalances()` — triggers manual refetch

### useMasterBalances

Filters `walletBalances` from `BalanceContext` to only master wallets (EOA + safes). Provides chain-specific selectors:

- `getMasterEoaNativeBalanceOf(chainId)` — master EOA native balance as summed `BigNumber` string
- `getMasterEoaBalancesOf(chainId)` — master EOA balances as `WalletBalance[]`
- `getMasterSafeNativeBalanceOf(chainId)` — master safe native balances (filters out wrapped tokens)
- `getMasterSafeOlasBalanceOfInStr(chainId)` — master safe OLAS balance as summed string
- `getMasterSafeErc20BalancesInStr(chainId)` — master safe non-native, non-OLAS balances as `Record<TokenSymbol, string>` (includes wrapped tokens like WXDAI)
- `getMasterSafeBalancesOf(chainId)` — master safe balances as `WalletBalance[]`
- `isMasterEoaLowOnGas` — `true` when master EOA refill requirement > 0
- `masterEoaGasRequirement` — formatted gas requirement number

The `isMasterEoaLowOnGas` check uses refill requirements from `BalancesAndRefillRequirementsProvider`, looking up the master EOA's native balance entry at `AddressZero`. It skips the check when `refillRequirements` contains the `MASTER_SAFE_REFILL_PLACEHOLDER` key (indicates the selected service uses placeholder requirements, not real per-address ones).

### useServiceBalances

Filters `walletBalances` to a specific service's wallets (safes + EOA). All derived values are scoped to the selected agent's `evmHomeChainId`:

- `serviceSafeBalances` — all balances in service safes (cross-chain)
- `serviceSafeNativeBalances` — native balances in service safe (home chain only)
- `serviceSafeErc20Balances` — non-native, non-OLAS balances including wrapped tokens (home chain only)
- `serviceSafeOlas` — OLAS balance in service safe (home chain only)
- `serviceEoaNativeBalance` — native balance in service EOA (home chain only, single entry)
- `serviceEoaErc20Balances` — non-native, non-OLAS balances including wrapped tokens in service EOA (home chain only)

### useAvailableAssets

Returns available assets in master wallets for a given chain. Used by `PearlWalletProvider` for the deposit/withdraw UI.

For each token configured on the chain:
- **OLAS**: master safe OLAS balance + total staking rewards (via `useStakingRewardsOf`)
- **Native gas**: master safe native balance + master EOA native balance (EOA included only when `includeMasterEoa` is `true`, which is the default)
- **Other tokens** (ERC20/wrapped): master safe balance

`isLoading` combines staking rewards loading state with balance loaded state.

### useAvailableAgentAssets

Returns available assets in agent (service) wallets. Token list is filtered: always includes native + OLAS, only includes other tokens if their symbol is listed in the agent's `erc20Tokens` config. Note: despite the config name, this includes any token type (ERC20, wrapped) whose symbol matches — e.g., `WXDAI` is a `TokenType.Wrapped` token that passes through this filter.

For each included token:
- **OLAS**: service safe OLAS balance
- **Native gas**: service safe native + service EOA native
- **Other tokens** (ERC20/wrapped): service safe balance + service EOA balance

Returns `AvailableAsset[]` with `{ address, symbol, amount }` (no `amountInStr` — uses `number` precision unlike `useAvailableAssets`).

## Failure / guard behavior

| Condition | Behavior |
|---|---|
| `getBalancesAndFundingRequirements` returns non-ok | Throws `"Failed to fetch balances and funding requirements for {serviceConfigId}"` |
| `getAllBalancesAndFundingRequirements` — individual fetch fails | Silently dropped via `Promise.allSettled` + `compact` — result is partial map |
| `BalanceProvider` query — not online / no wallets / services is `null`/`undefined` | Query disabled (`enabled: false`), returns `undefined` data |
| `getCrossChainWalletBalances` — native balance fetch fails | `console.error`, returns empty array for that batch (other chains continue) |
| `getCrossChainWalletBalances` — entire chain iteration fails | `console.error`, skips that chain (try/catch around outer loop) |
| `getCrossChainWalletBalances` — invalid wallet address | `isAddress` check returns `null` for that wallet's native balance, filtered by `!isNil` |
| `getCrossChainStakedBalances` — nil token ID, invalid service ID, or missing master safe | Returns `null` for that service (filtered out) |
| `getCrossChainStakedBalances` — registry info fetch fails | `Promise.allSettled` catches — `console.error` and skip |
| `correctBondDepositByServiceState` — invalid state value | `console.error`, returns raw bond/deposit unchanged (default case) |
| `useMasterBalances` — no `masterSafes` or `walletBalances` | Returns empty array `[]` for `allMasterWalletBalances` |
| `useMasterBalances` — no `masterEoa` | Returns `undefined` for EOA-specific getters |
| `useMasterBalances` — `refillRequirements` has placeholder key | Skips EOA gas requirement check (returns `undefined`) |
| `useServiceBalances` — no service safes/EOA | Returns empty/undefined filtered arrays |
| `useAvailableAssets` — no `walletChainId` | Returns empty array |
| `useAvailableAgentAssets` — no `evmHomeChainId` | Returns empty array |

## Test-relevant notes

- **`BalanceService`** is a pure API client — test by mocking `fetch`. `getAllBalancesAndFundingRequirements` silently drops failures (important: verify partial results when some services fail).

- **`getCrossChainWalletBalances`** depends on `providers` (ethers providers + multicall), `TOKEN_CONFIG`, and `isAddress`/`getAddress` from ethers. Mock `providers` to control which chains are iterated. Native balances use `provider.getBalance`, ERC20 uses `multicallProvider.all`. The function handles three token types: `NativeGas`, `Erc20`, and `Wrapped` (both `Erc20` and `Wrapped` go through multicall).

- **`getCrossChainStakedBalances`** depends on `StakedAgentService.getServiceRegistryInfo` — mock this static method. The `correctBondDepositByServiceState` function is not exported but contains important branching logic — test it through `getCrossChainStakedBalances` or extract for direct testing.

- **`BalanceProvider`** — test by mocking `getCrossChainBalances` (exported from `utils.ts`), `MasterWalletContext`, `ServicesContext`, and `OnlineStatusContext`. Verify derived totals (`totalOlasBalance`, `totalEthBalance`, `totalStakedOlasBalance`) and `getStakedOlasBalanceOf` with various balance/staked fixtures.

- **`useMasterBalances`** — depends on `useServices`, `useMasterWalletContext`, `useBalanceContext`, and `useBalanceAndRefillRequirementsContext`. The `requiresFund` helper uses `BigInt` comparison. The `MASTER_SAFE_REFILL_PLACEHOLDER` guard is an important branch. ERC20 balance aggregation uses `sumBigNumbers` with string precision.

- **`useServiceBalances`** — depends on `useServices`, `useService`, and `useBalanceContext`. All derived values filter by `evmHomeChainId` — test that balances for other chains are excluded. OLAS is explicitly excluded from ERC20 results (`symbol !== TokenSymbolMap.OLAS`).

- **`useAvailableAssets`** — depends on `useMasterBalances` and `useStakingRewardsOf`. The `includeMasterEoa` option (defaults `true`) controls whether EOA native balance is included — test both paths. OLAS balance includes staking rewards via `sumBigNumbers`.

- **`useAvailableAgentAssets`** — depends on `useServices` and `useServiceBalances`. Token filtering logic uses `erc20Tokens` from agent config — test that unlisted tokens are excluded. Unlike `useAvailableAssets`, this hook uses `number` for amounts (not string precision).

- **`WalletBalance.balance` is deprecated** — `balanceString` preserves precision. Both are populated by `getCrossChainWalletBalances` via `formatUnits`.

- **Address comparison**: `getCrossChainWalletBalances` uses strict ethers `isAddress`/`getAddress` checks; consumer hooks use `areAddressesEqual` (case-insensitive). This difference matters for test fixtures.
