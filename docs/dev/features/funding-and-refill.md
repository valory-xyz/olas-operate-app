# Funding & Refill

## Overview

The funding system determines what tokens an agent needs, how much, and orchestrates the flow of funds from external sources (on-ramp) through the master wallet to the agent. It builds on top of the balance system (which tracks what you *have*) to compute what you *need* and how to get it.

The system has three layers:

1. **Refill requirements provider** — polls the middleware for per-service funding requirements, derives refill/total/agent-funding amounts, and exposes start-agent eligibility
2. **Requirement formatting hooks** — transform raw wei-denominated requirements into UI-ready token lists, consolidate multi-wallet needs, and compute static initial funding estimates
3. **Bridge/on-ramp parameter builders** — convert refill requirements into bridge request shapes and Transak quote queries for cross-chain and fiat-to-crypto flows

```
BalancesAndRefillRequirementsProvider (middleware polling + derivation)
  ├── useGetRefillRequirements (total requirements → TokenRequirement[])
  ├── useAgentFundingRequests (agent wallet needs → consolidated per-token)
  ├── useGetBridgeRequirementsParams (refill → bridge request params)
  └── useGetOnRampRequirementsParams (deposit → bridge request params)

useInitialFundingRequirements (static config → per-chain token amounts)
useTotalNativeTokenRequired (bridge requirements → total native token)
useTotalFiatFromNativeToken (Transak API → fiat price quote)

FundService (POST /fund → trigger master-to-agent transfer)
```

## Source of truth

- `frontend/service/Fund.ts` — fund API client (master-to-agent transfer)
- `frontend/service/Balance.ts` — funding requirements API client (includes partial-success `getAllBalancesAndFundingRequirements`)
- `frontend/context/BalancesAndRefillRequirementsProvider/BalancesAndRefillRequirementsProvider.tsx` — refill requirements state, polling with adaptive backoff, cross-service aggregation
- `frontend/types/Funding.ts` — `BalancesAndFundingRequirements`, `AddressBalanceRecord`, `MasterSafeBalanceRecord`, `TokenBalanceRecord`
- `frontend/types/Bridge.ts` — `BridgeRequest`, `BridgeRefillRequirementsRequest`
- `frontend/hooks/useGetRefillRequirements.ts` — total requirements → formatted `TokenRequirement[]`
- `frontend/hooks/useAgentFundingRequests.tsx` — agent funding needs consolidation + formatted string
- `frontend/hooks/useInitialFundingRequirements.ts` — static initial funding from service template config
- `frontend/hooks/useGetBridgeRequirementsParams.ts` — refill requirements → bridge request params
- `frontend/hooks/useGetOnRampRequirementsParams.ts` — manual deposit → bridge request params
- `frontend/hooks/useTotalNativeTokenRequired.ts` — bridge requirements → total native token with freeze logic
- `frontend/hooks/useTotalFiatFromNativeToken.ts` — Transak quote API for fiat conversion

## Contract / schema

### Fund API (`FundService`)

| Method | HTTP | Endpoint | Body | Returns |
|---|---|---|---|---|
| `fundAgent` | POST | `/api/v2/service/{id}/fund` | `ChainFunds` | `{ error: string \| null }` |

The request body is a nested map of chain → wallet address → token address → wei amount:

```typescript
type ChainFunds = Partial<{
  [chain in SupportedMiddlewareChain]: {
    [address: Address]: {
      [tokenAddress: Address]: string; // wei amount
    };
  };
}>;
```

The backend returns 409 if a funding operation is already in progress, but the frontend does not distinguish status codes — `fundAgent` rejects with the generic string `"Failed to fund agent"` for any non-ok response.

### BalancesAndRefillRequirementsProvider context shape

```typescript
{
  isBalancesAndFundingRequirementsLoading: boolean;
  isBalancesAndFundingRequirementsLoadingForAllServices: boolean;
  isBalancesAndFundingRequirementsReadyForAllServices: boolean;
  isBalancesAndFundingRequirementsEnabledForAllServices: boolean;
  refillRequirements: Optional<AddressBalanceRecord | MasterSafeBalanceRecord>;
  getRefillRequirementsOf: (chainId: EvmChainId, serviceConfigId?: string) => Maybe<AddressBalanceRecord>;
  totalRequirements: Optional<AddressBalanceRecord | MasterSafeBalanceRecord>;
  agentFundingRequests: Optional<AddressBalanceRecord>;
  canStartAgent: boolean;
  isRefillRequired: boolean;
  isAgentFundingRequestsStale: boolean;       // true during in_progress or cooldown
  isPearlWalletRefillRequired: boolean;       // any initially-funded agent needs refill
  refetch: () => Promise<[...]>;
  refetchForSelectedAgent: () => Promise<...>;
  allowStartAgentByServiceConfigId: (id?: string) => boolean;
  hasBalancesForServiceConfigId: (id?: string) => boolean;
  resetQueryCache: () => void;
}
```

### TokenRequirement (output of useGetRefillRequirements)

```typescript
type TokenRequirement = {
  amount: number;       // formatted (not wei)
  symbol: TokenSymbol;
  iconSrc: string;
};
```

### BridgeRefillRequirementsRequest (output of useGetBridgeRequirementsParams)

```typescript
type BridgeRefillRequirementsRequest = {
  bridge_requests: Array<{
    from: { chain: string; address: Address; token: Address };
    to: { chain: string; address: Address; token: Address; amount: string };
  }>;
  force_update: boolean;
};
```

### Bridge refill requirements response (used by useTotalNativeTokenRequired)

`POST /api/bridge/bridge_refill_requirements` — response after submitting bridge requests from `useGetBridgeRequirementsParams`:

```json
{
  "id": "rb-36c6cbe0-1841-4de3-b9f6-873305a833f5",
  "bridge_request_status": [
    { "eta": 5, "message": null, "status": "QUOTE_DONE" }
  ],
  "balances": {
    "ethereum": {
      "0x74074a70dcE60E6996EC4b555342679645788ce5": {
        "0x0000000000000000000000000000000000000000": "0"
      }
    }
  },
  "bridge_refill_requirements": {
    "ethereum": {
      "0x74074a70dcE60E6996EC4b555342679645788ce5": {
        "0x0000000000000000000000000000000000000000": "5628894686394391"
      }
    }
  },
  "bridge_total_requirements": {
    "ethereum": {
      "0x74074a70dcE60E6996EC4b555342679645788ce5": {
        "0x0000000000000000000000000000000000000000": "5628894686394391"
      }
    }
  },
  "expiration_timestamp": 1773075127,
  "is_refill_required": true
}
```

`useTotalNativeTokenRequired` reads `bridge_refill_requirements` (onboard mode) or `bridge_total_requirements` (deposit mode) to calculate how much native token the user needs on the source chain. `balances` provides the existing native token balance, which is added to the top-up amount to get `totalNativeTokenRequired` (the full amount that should be on-chain).

### Transak quote response (used by useTotalFiatFromNativeToken)

`GET ON_RAMP_GATEWAY_URL/price-quote?fiatCurrency=USD&cryptoCurrency=ETH&isBuyOrSell=BUY&network=base&paymentMethod=credit_debit_card&cryptoAmount=0.00570193`

```json
{
  "response": {
    "quoteId": "db19d05e-cacc-43c0-80e7-0ae973662063",
    "conversionPrice": 0.0004898564956664364,
    "marketConversionPrice": 0.0004933885928557331,
    "slippage": 0.72,
    "fiatCurrency": "USD",
    "cryptoCurrency": "ETH",
    "paymentMethod": "credit_debit_card",
    "fiatAmount": 13.17,
    "cryptoAmount": 0.00570193,
    "isBuyOrSell": "BUY",
    "network": "base",
    "totalFee": 1.53,
    "feeBreakdown": [
      { "name": "Transak fee", "value": 1.53, "id": "transak_fee" },
      { "name": "Network/Exchange fee", "value": 0, "id": "network_fee" }
    ],
    "nonce": 1773074894,
    "cryptoLiquidityProvider": "transak"
  }
}
```

The frontend uses `fiatAmount` and `cryptoAmount` from the response. `fiatAmount` gets a $5 buffer added; `cryptoAmount` is used to derive the equivalent buffer in crypto.

## Runtime behavior

### Refill requirements polling (BalancesAndRefillRequirementsProvider)

Two parallel queries run — one for the selected service, one for all services:

| Query | Key | Interval | Enabled when |
|---|---|---|---|
| Selected service | `BALANCES_AND_REFILL_REQUIREMENTS_KEY(configId)` | adaptive (see below) | configId + logged in + online |
| All services | `ALL_BALANCES_AND_REFILL_REQUIREMENTS_KEY(ids)` | same adaptive interval | serviceConfigIds.length + logged in + online |

Both queries share the same adaptive interval, driven by the *selected* service's running/reward state via `useRequirementsFetchInterval`. The all-services query uses `Promise.allSettled` internally (`BalanceService.getAllBalancesAndFundingRequirements`), so individual service failures are silently dropped — the result may be a partial map. `isBalancesAndFundingRequirementsReadyForAllServices` means "query enabled AND not loading", not "every requested service returned data".

The adaptive interval (`useRequirementsFetchInterval`) uses three tiers:

1. **Stale data** (funding in progress or cooldown) — 30 seconds
2. **Service running but not yet eligible for rewards** — exponential backoff via `getExponentialInterval(refetchCount)`, capped at `BACKOFF_STEPS - 1`
3. **Otherwise** — 60 minutes

The backoff counter resets when the service stops running. The interval is further scaled by `useDynamicRefetchInterval` based on window visibility.

### Derived values from provider

- `refillRequirements` — `refill_requirements[homeChain]` for the selected service
- `totalRequirements` — `total_requirements[homeChain]` for the selected service
- `agentFundingRequests` — `agent_funding_requests[homeChain]` for the selected service (warning: multi-chain agents would break this)
- `canStartAgent` — `allow_start_agent` from middleware (defaults to `false`)
- `isRefillRequired` — `is_refill_required` from middleware (defaults to `true` — note: `|| true` means it's always true when data is undefined)
- `isAgentFundingRequestsStale` — `agent_funding_in_progress || agent_funding_requests_cooldown`
- `isPearlWalletRefillRequired` — true when ANY initially-funded agent across all services needs a refill. Only considers agents that have `isInitialFunded` set in the Electron store.
- `getRefillRequirementsOf(chainId, serviceConfigId)` — looks up a specific service's refill requirements from the all-services query

### Total requirements formatting (useGetRefillRequirements)

Transforms `totalRequirements` (raw wei per wallet address per token) into a sorted `TokenRequirement[]`:

1. Reads master safe requirements using either the safe address or `MASTER_SAFE_REFILL_PLACEHOLDER`
2. For native tokens (`AddressZero`): combines master safe + master EOA requirements
3. For other tokens: uses the master safe requirement directly
4. Formats each to `{ amount, symbol, iconSrc }` via `getTokenMeta`
5. Filters out zero amounts
6. Sorts descending by amount
7. Caches in state — only recalculates when `totalTokenRequirements` is empty

Resets (clears cached requirements + optionally query cache) when the selected agent type changes.

### Agent funding consolidation (useAgentFundingRequests)

Merges `agentFundingRequests` (per-wallet-address token amounts) into a single per-token record by summing BigInt values across all agent wallets. Returns null while `isAgentFundingRequestsStale` is true.

Derived values:
- `agentTokenRequirements` — `{ [tokenAddress]: totalAmount }` consolidated across wallets
- `eoaTokenRequirements` — requirements for the service EOA only
- `agentTokenRequirementsFormatted` — human-readable string: `"10 XDAI, 15 USDC and 100 OLAS on Gnosis chain"`
- `isAgentBalanceLow` — true if any consolidated requirement > 0

### Initial funding requirements (useInitialFundingRequirements)

Computes static, config-based funding requirements from service templates. Does not poll — purely derived from:

- `SERVICE_TEMPLATES[agentType].configurations` — per-chain `fund_requirements`
- `STAKING_PROGRAMS[chainId][programId].stakingRequirements[OLAS]` — OLAS staking minimum
- `CHAIN_CONFIG[chainId].safeCreationThreshold` — native token for safe creation (0 if safe already exists)
- `AGENT_CONFIG[agentType].additionalRequirements` — extra per-chain token amounts

For each chain in the service template:
```
Native = fund_requirements[AddressZero].safe + agent + safeCreationThreshold + AGENT_DEPLOYMENT_GAS_REQUIREMENT_WEI(2)
OLAS = stakingRequirements[OLAS]
Additional = additionalRequirements[chainId]
```

Returns `{ [chainId]: { [tokenSymbol]: amount } }` with formatted (not wei) amounts.

### Bridge requirements params (useGetBridgeRequirementsParams)

Converts refill requirements into bridge request parameters. Accepts three arguments:

- `fromChainId` — source chain for bridging (can be `AllEvmChainId`, including Ethereum)
- `defaultFromToken` — optional override for the source token address. When provided, all requests use this token instead of resolving via `getFromToken`
- `transferDirection` — `'from'` (default) or `'to'`: controls which side of the bridge request is checked when combining native token requirements

For each wallet+token pair in `refillRequirements`:

1. Only includes master EOA or master safe (by address or placeholder)
2. Skips zero amounts and invalid addresses
3. Resolves source-chain token via `getFromToken` (handles bridged tokens like `USDC.e` → `USDC`), unless `defaultFromToken` is provided
4. Deduplicates: if a request with the same from/to chain+address+token already exists, sums the amounts
5. Post-processes via `useCombineNativeTokenRequirements`: for native tokens, combines master safe + master EOA refill requirements into the `to.amount`

`from.address` is always the master EOA. `to.address` is the master safe (or master EOA if no safe exists).

### On-ramp requirements params (useGetOnRampRequirementsParams)

Creates a single `BridgeRequest` from a token address and amount (used in deposit mode where the user manually specifies amounts):

- `from`: on-ramp chain, master EOA, native token (`AddressZero`)
- `to`: wallet chain, master safe (or EOA), specified token, `parseUnits(amount, decimals)`

### Total native token calculation (useTotalNativeTokenRequired)

Calculates how much native token the user needs to on-ramp to cover all requirements (native + bridged non-native tokens). Two modes:

- **onboard**: uses `bridge_refill_requirements` (top-up amount)
- **deposit**: uses `bridge_total_requirements` (full amount)

Two output values:

- `totalNativeTokenToPay` — amount the user needs to actually purchase/on-ramp (bridge requirements for non-native tokens + direct native token needs)
- `totalNativeTokenRequired` — `totalNativeTokenToPay` + existing native balance on the source chain (the full amount that should be on-chain after on-ramping, accounting for balance already there)

```
totalNativeTokenToPay = bridgeRequirementsOfNonNativeTokens + nativeTokenFromBridgeParams
totalNativeTokenRequired = totalNativeTokenToPay + existingNativeBalance
```

`nativeTokenFromBridgeParams` is only included when the on-ramp chain equals the destination chain (no bridging needed for the native token).

**Freeze logic**: once the user initiates on-ramping (`isBuyCryptoBtnLoading`) or completes it (`isOnRampingTransactionSuccessful`), the calculated totals are frozen in a ref. This prevents recalculation from bridge requirement updates during the payment flow. The frozen ref resets when the flow restarts.

Updates `onRampContext.nativeAmountToPay` and `nativeTotalAmountRequired` via effects (skipped while frozen).

### Fiat price quote (useTotalFiatFromNativeToken)

Fetches a Transak price quote to convert native token amount to USD:

- Endpoint: `ON_RAMP_GATEWAY_URL/price-quote`
- Query params: `fiatCurrency=USD`, `cryptoCurrency`, `isBuyOrSell=BUY`, `network`, `paymentMethod=credit_debit_card`, `cryptoAmount`
- Adds a `$5 USD` buffer to account for price fluctuations during the on-ramp process
- Derives `nativeAmountToDisplay` = `nativeAmountToPay + (cryptoAmount/fiatAmount * $5)` (buffer converted to crypto)
- **Prerequisite**: `ensureRequired(selectedChainId)` is called before `useQuery` — if `selectedChainId` is nil, the hook throws immediately (not a query guard)
- Enabled when: `!skip && fromChain && nativeTokenAmount` are truthy

## Failure / guard behavior

- **FundService.fundAgent** — rejects with `"Failed to fund agent"` on non-ok response. Backend returns 409 if funding already in progress.
- **isRefillRequired default** — uses `|| true` instead of `?? true`, so when `balancesAndFundingRequirements` is undefined, `isRefillRequired` is always `true`
- **agentFundingRequests multi-chain warning** — the provider extracts `agent_funding_requests` for only the home chain; agents requiring funds on multiple chains would lose requirements for non-home chains
- **isPearlWalletRefillRequired** — returns false when `masterSafes`, `services`, or all-services data is empty. Only considers agents with `isInitialFunded` set in store.
- **useGetRefillRequirements** — returns empty array when loading, no master EOA, or no master wallet data. Caches requirements in state — won't recalculate until explicitly reset or agent type changes.
- **useAgentFundingRequests** — returns null when `isAgentFundingRequestsStale` is true (funding in progress or cooldown)
- **useInitialFundingRequirements** — returns empty object when service template is nil or master wallets not fetched. Skips chains with no `stakingProgramId`.
- **useGetBridgeRequirementsParams** — returns null when loading, no refill requirements, or no addresses. Skips invalid addresses via `isAddress` check.
- **useGetOnRampRequirementsParams** — returns null when master wallets not fetched or missing chain config
- **useTotalNativeTokenRequired** — returns early when bridge requirements unavailable or master EOA missing. Returns 0 for `totalNativeToken` when no data.
- **useTotalFiatFromNativeToken** — `ensureRequired(selectedChainId)` throws synchronously if chain ID is nil, before any query logic runs. `getEthWithBuffer` returns unmodified amount when `fiatAmount` is 0 (avoids division by zero). Logs and rethrows fetch errors.

## Test-relevant notes

- `FundService` is a single-method API client — test by mocking `fetch`. The frontend rejects with a generic string for any non-ok response (no status-specific handling)
- `BalancesAndRefillRequirementsProvider` has adaptive polling with three tiers + exponential backoff — test each tier transition and backoff counter behavior
- `isRefillRequired` uses `|| true` (not `?? true`) — always true when data is undefined. Test this edge case.
- `isPearlWalletRefillRequired` cross-references all-services data with Electron store's `isInitialFunded` — test with various combinations of funded/unfunded agents
- `useGetRefillRequirements` caches requirements in state and only recalculates when empty — test the caching behavior and reset on agent type change
- `useGetRefillRequirements` combines native token requirements from master safe + master EOA — test both `AddressBalanceRecord` (real address) and `MasterSafeBalanceRecord` (placeholder) paths
- `useAgentFundingRequests` merges BigInt values across wallets — test with multiple agent wallets contributing to the same token
- `useInitialFundingRequirements` includes `AGENT_DEPLOYMENT_GAS_REQUIREMENT_WEI = 2` wei — a trivially small constant that adds to native requirements
- `useGetBridgeRequirementsParams` deduplicates requests by summing amounts — test with overlapping wallet entries for the same token
- `useTotalNativeTokenRequired` freeze logic uses a ref — test that frozen values persist through re-renders when `shouldFreezeTotals` is true
- `useTotalFiatFromNativeToken` adds a fixed `$5` fiat buffer — test the buffer calculation with `getEthWithBuffer`
- `useGetOnRampRequirementsParams` always uses `AddressZero` as `from.token` — the on-ramp source is always native token
