# Wallet

## Overview

Wallet management handles the full wallet hierarchy: fetching wallets from the middleware, creating EOAs and multisig Safes, resolving backup signers, querying on-chain multisig owners, and managing the Pearl Wallet UI state for deposits and withdrawals. All agent operations depend on wallets — services are deployed to agent wallets funded from master wallets.

```
Master EOA (single, derived from mnemonic)
  └── Master Safes (one per chain, multisig with backup signer)
        └── Agent Wallets (created per service deployment)
```

## Source of truth

- `frontend/service/Wallet.ts` — wallet fetch, EOA/Safe creation, backup owner update, mnemonic retrieval
- `frontend/context/MasterWalletProvider.tsx` — master wallet state (EOA + Safes from API, polling)
- `frontend/context/PearlWalletProvider.tsx` — wallet chain/deposit/withdraw state for the Pearl Wallet UI
- `frontend/hooks/useWallet.ts` — context accessor for `MasterWalletProvider`
- `frontend/hooks/useBackupSigner.ts` — resolves backup signer address (setup context → on-chain fallback)
- `frontend/hooks/useMultisig.ts` — multisig owners via on-chain calls (single and batch)
- `frontend/hooks/useMasterSafeCreationAndTransfer.ts` — safe creation + asset transfer mutation
- `frontend/utils/wallet.ts` — token resolution helpers (`getTokenDetails`, `getFromToken`, `tokenBalancesToSentence`)
- `frontend/constants/wallet.ts` — wallet type hierarchy (`MasterEoa`, `MasterSafe`, `MasterWallet`, etc.)
- `frontend/types/Wallet.ts` — middleware response types, `SafeCreationResponse`, `SafeCreationStatus`

## Contract / schema

### Wallet API (`WalletService`)

Methods: `getWallets`, `createEoa`, `createSafe`, `updateSafeBackupOwner`, `getRecoverySeedPhrase`. See [middleware API docs](https://github.com/valory-xyz/olas-operate-middleware/blob/main/docs/api.md) for endpoint details.

`getWallets` accepts an `AbortSignal` for cancellation (used by React Query). `getRecoverySeedPhrase` uses `parseApiError` on failure (note: the error message is `"Failed to login"` — a copy-paste artifact). All other methods throw generic errors. Backend errors use the format `{ "error": "message" }`.

### Example: `getWallets` response

```json
[
  {
    "address": "0xC581D42746dfBf60E9F1beA5BeeF2ED4619CCfEE",
    "safes": {
      "polygon": "0xE97C17124cd1CD95300E2bE3e207C4B8162A535C"
    },
    "safe_chains": ["polygon"],
    "ledger_type": "ethereum",
    "safe_nonce": 8778523976991075659331170829352821736443506761734954639667311334066645078123
  }
]
```

Note: The backend returns `ledger_type` as a string (`"ethereum"`), but the frontend `MiddlewareWalletResponse` type defines it as `MiddlewareLedger` (a numeric enum: `ETHEREUM = 0, SOLANA = 1`). The frontend does not use this field in any logic — it's passed through without conversion.

### Example: `createSafe` request/response

Request:
```json
{
  "chain": "polygon",
  "backup_owner": "0x2455556c4bd75975ccFa293B87476Fb0d6CB5524",
  "transfer_excess_assets": true
}
```

Response:
```json
{
  "status": "SAFE_CREATED_TRANSFER_COMPLETED",
  "safe": "0xE97C17124cd1CD95300E2bE3e207C4B8162A535C",
  "create_tx": "0x0a816f81ec273f8ab6f44dc699dac5bd202ca55f79148e62e4de653e3be3cc0c",
  "transfer_txs": {
    "0xFEF5d947472e72Efbb2E388c730B7428406F2F95": "0x2f8bc8393f78d0205c79c3451b44e011d8c2bd51a3ed8d563b74b889b721770e",
    "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174": "0xe307bd68fd8611231c20439c79fa57d4036d321e2af98f482f61aec7bbe15b4a",
    "0x0000000000000000000000000000000000000000": "0x52d032905469208eb8f79da769fc78b34a9ef57161c7695b6e56568e08965867"
  },
  "transfer_errors": {},
  "message": "Safe created and funded successfully."
}
```

`transfer_txs` is keyed by token address — `0x000...000` is the native gas token. `transfer_errors` uses the same key structure for failed transfers.

### Example: `createEoa` request/response

Request:
```json
{ "ledger_type": "ethereum" }
```

Response (first creation — includes mnemonic):
```json
{
  "wallet": { "address": "0xC581D42746dfBf60E9F1beA5BeeF2ED4619CCfEE", "ledger_type": "ethereum", "safe_chains": [], "safes": {} },
  "mnemonic": ["creek", "salute", "fury", "panel", "invest", "mixture", "filter", "bright", "smooth", "avocado", "grain", "exhibit"]
}
```

Response (wallet already exists — mnemonic is null):
```json
{
  "wallet": { "address": "0xC581D42746dfBf60E9F1beA5BeeF2ED4619CCfEE", "ledger_type": "ethereum", "safe_chains": ["polygon"], "safes": { "polygon": "0xE97C17124cd1CD95300E2bE3e207C4B8162A535C" } },
  "mnemonic": null
}
```

### Example: `updateSafeBackupOwner` request/response

Request:
```json
{ "chain": "polygon", "backup_owner": "0x2455556c4bd75975ccFa293B87476Fb0d6CB5524" }
```

Response:
```json
{
  "wallet": { "address": "0xC581D42746dfBf60E9F1beA5BeeF2ED4619CCfEE" },
  "chain": "polygon",
  "backup_owner_updated": true,
  "message": "Backup owner updated successfully."
}
```

### Example: `getRecoverySeedPhrase` request/response

Request:
```json
{ "ledger_type": "ethereum", "password": "mypassword" }
```

Response:
```json
{ "mnemonic": ["creek", "salute", "fury", "panel", "invest", "mixture", "filter", "bright", "smooth", "avocado", "grain", "exhibit"] }
```

### SafeCreationResponse status values

| Status | Meaning |
|---|---|
| `SAFE_CREATION_FAILED` | Safe creation itself failed |
| `SAFE_CREATED_TRANSFER_FAILED` | Safe created but asset transfer failed |
| `SAFE_EXISTS_TRANSFER_FAILED` | Safe already existed, transfer failed |
| `SAFE_CREATED_TRANSFER_COMPLETED` | Safe created and assets transferred |
| `SAFE_EXISTS_ALREADY_FUNDED` | Safe already existed and was already funded |

### Wallet type hierarchy

Defined in `frontend/constants/wallet.ts`: `Eoa`, `Safe`, `MasterEoa`, `MasterSafe`, `MasterWallet`, `AgentEoa`, `AgentSafe`, `AgentWallet`. Base types are discriminated by `type` (`'eoa'` | `'multisig'`), then extended with `owner` (`'master'` | `'agent'`).

### Bridged token source map (`utils/wallet.ts`)

`BRIDGED_TOKEN_SOURCE_MAP` in `frontend/utils/wallet.ts` maps bridged token symbols to their source-chain equivalents (e.g., `USDC.e` → `USDC`). Used by `getFromToken` to resolve destination-chain bridged tokens.

## Runtime behavior

### MasterWalletProvider

Polls `WalletService.getWallets` every 5 seconds (when online). The raw `MiddlewareWalletResponse[]` is transformed via `transformMiddlewareWalletResponse`:

1. Each response's `address` becomes a `MasterEoa` (after `getAddress` validation)
2. Each entry in `response.safes` (keyed by middleware chain like `"polygon"`) becomes a `MasterSafe` with `evmChainId` converted via `asEvmChainId`
3. Results are filtered to only `WALLET_OWNER.Master` with valid addresses (`isAddress`)

Derived values:
- `masterEoa` — first wallet matching `type: EOA, owner: Master`
- `masterSafes` — all wallets matching `type: Safe, owner: Master`
- `getMasterSafeOf(chainId)` — find master safe for a specific chain

### Backup signer resolution (`useBackupSigner`)

Returns `backupSigner.address` from setup context if available, otherwise falls back to `allBackupAddresses[0]` from `useMultisigs`. This means during setup the user-chosen signer is used, but post-setup it reads actual on-chain owners.

### Multisig owners (`useMultisig` / `useMultisigs`)

**`useMultisig(safe)`** — queries a single safe's owners via `ethers.Contract.getOwners()`. Disabled when `safe` is nil. Derives `backupOwners` by filtering out `masterEoa.address` (case-insensitive comparison via `toLowerCase`).

**`useMultisigs(safes)`** — queries multiple safes across chains using `ethers-multicall`:
1. Groups safes by `evmChainId`
2. Creates `MulticallContract` calls for each safe's `getOwners()`
3. Executes batched calls per chain via `multicallProvider.all()`
4. Derives `allBackupAddresses` (deduped via `Set`, excluding master EOA with strict `!==` comparison) and `allBackupAddressesByChainId`

Both poll every 5 seconds.

### Safe creation (`useMasterSafeCreationAndTransfer`)

Takes `tokenSymbols` to track per-token transfer status. Calls `WalletService.createSafe(chain, backupSignerAddress)` and maps the response into:
- `safeCreationDetails` — `{ isSafeCreated, txnLink, status }` where `isSafeCreated` is `false` only for `SAFE_CREATION_FAILED`
- `transferDetails` — `{ isTransferComplete, transfers }` where:
  - `isTransferComplete` — `true` when status is `SAFE_CREATED_TRANSFER_COMPLETED` or `SAFE_EXISTS_ALREADY_FUNDED`
  - `transfers` — per-token `{ symbol, status, txnLink }` where status is:
    - `'error'` — token address found in `transfer_errors`
    - `'finish'` — token address found in `transfer_txs`
    - `'wait'` — token address in neither (transfer pending/not attempted)

Native gas tokens are looked up via `AddressZero` (`0x000...000`). On success, refetches balance/refill requirements. On error, shows toast.

### Pearl Wallet UI state (`PearlWalletProvider`)

Manages the chain-aware wallet UI for viewing balances, depositing, and withdrawing. Key state:

- `walletChainId` — which chain's wallet to display. Initialized to `selectedAgentConfig.evmHomeChainId`, auto-synced when the selected agent changes — **except** when the user is on `PAGES.PearlWallet` or `PAGES.FundPearlWallet` (prevents auto-run agent rotation from switching the tab under the user).
- `walletStep` — current step in the wallet flow (`PEARL_WALLET_SCREEN`, `DEPOSIT`, `WITHDRAW`, etc.)
- `amountsToWithdraw` / `amountsToDeposit` — per-token amounts (`TokenAmounts` = `Record<TokenSymbol, { amount, withdrawAll? }>`)
- `defaultRequirementDepositValues` — pre-filled deposit amounts from refill requirements (via `getInitialDepositForMasterSafe`)
- `chains` — unique list of chains derived from services via `getChainList` (matches services to `ACTIVE_AGENTS` configs)
- `stakedAssets` — OLAS staked per service on the current chain, with agent name and icon
- `availableAssets` — available master wallet assets on the current chain (via `useAvailableAssets`; excludes master EOA assets during deposit on staking pages)

`onReset` clears all amounts (`amountsToWithdraw`, `amountsToDeposit`, `defaultDepositValues`) and optionally resets `walletStep` to `PEARL_WALLET_SCREEN` when `canNavigateOnReset` is `true`. It does not navigate pages — actual page navigation is handled by `gotoPearlWallet()`, which calls `goto(PAGES.PearlWallet)` and resets the step. `onWalletChainChange` calls `onReset` then switches chain.

`isLoading` is a composite: `isServicesLoading || !isLoaded || isBalanceLoading || isAvailableAssetsLoading`.

### Wallet token utilities (`utils/wallet.ts`)

Pure functions for token resolution:

- **`tokenBalancesToSentence(tokenAmounts)`** — formats `{ ETH: { amount: 0.5 }, DAI: { amount: 100 } }` into `"0.5 ETH and 100 DAI"`. Filters out zero amounts. Handles 0 (empty string), 1 (single), 2 (`"X and Y"`), and 3+ (`"X, Y and Z"`) tokens.
- **`getTokenDetails(tokenAddress, chainConfig)`** — resolves a token address to its symbol and decimals. `AddressZero` maps to the chain's native gas token (defaults to `ETH`/18 if no native token found). Other addresses are matched by `areAddressesEqual`.
- **`getTokenDecimal(tokenAddress, chainConfig)`** — shorthand for `getTokenDetails(...).decimals`.
- **`getFromToken(tokenAddress, fromChainConfig, toChainConfig)`** — resolves a destination-chain token address to the corresponding source-chain address. Handles bridged tokens via `BRIDGED_TOKEN_SOURCE_MAP` (e.g., `USDC.e` on Polygon → `USDC` on Ethereum). `AddressZero` passes through as-is.

## Failure / guard behavior

| Condition | Behavior |
|---|---|
| `getWallets` returns non-ok | Throws `"Failed to fetch wallets"` |
| `createEoa` returns non-ok | Throws `"Failed to create EOA"` |
| `createSafe` returns non-ok | Throws `"Failed to create safe"` |
| `updateSafeBackupOwner` returns non-ok | Throws `"Failed to add backup owner"` |
| `getRecoverySeedPhrase` returns non-ok | `parseApiError` with message `"Failed to login"` (copy-paste artifact) |
| `getAddress` throws for invalid address in wallet response | Error propagates from `transformMiddlewareWalletResponse` — the transform doesn't catch |
| `useMultisig` with `safe` = nil | Query disabled, returns `undefined` owners |
| `useMultisigs` with no multicall provider for a chain | `console.error`, skips that chain (continues with others) |
| Token config not found during safe creation transfer mapping | Throws `"Token config not found for symbol: {symbol} on chain: {chain}"` |
| `useMasterSafeCreationAndTransfer` mutation error | `console.error` + `message.error('Failed to create master safe.')` |
| `usePearlWallet` outside `PearlWalletProvider` | Returns the context default (no-op stubs) — the guard in the source (`if (!context)`) is unreachable because `createContext` provides a non-null default object |
| `getFromToken` — token symbol not found on destination chain | Throws `"Failed to get token symbol for the destination token: {address}"` |
| `getFromToken` — source token not found on source chain | Throws `"Failed to get source token for the destination token: {address}"` |

## Test-relevant notes

- **`WalletService`** is a pure API client — test by mocking `fetch`. Most methods throw generic errors on non-ok responses; `getRecoverySeedPhrase` is the exception (uses `parseApiError`).
- **`MasterWalletProvider`** — `transformMiddlewareWalletResponse` is not exported but contains the core logic. Test through the provider by mocking `WalletService.getWallets` and verifying `masterEoa`, `masterSafes`, `getMasterSafeOf` derivations. The `getAddress` call will throw for truly invalid addresses — not just return false.
- **`useMultisig`** depends on `ethers.Contract` — needs mocking of the Contract constructor and `getOwners`. `useMultisig` uses case-insensitive `toLowerCase` to filter backup owners; `useMultisigs` uses strict `!==` — this difference matters for test fixtures.
- **`useMultisigs`** additionally depends on `ethers-multicall` `MulticallContract` and `multicallProvider.all()`.
- **`useMasterSafeCreationAndTransfer`** depends on `useBackupSigner`, `useServices`, `useBalanceAndRefillRequirementsContext`, and `useMessageApi` — all need mocking. The `TOKEN_CONFIG` lookup and `AddressZero` for native gas tokens are important edge cases.
- **`PearlWalletProvider`** has many dependencies (`useServices`, `useService`, `useBalanceContext`, `useBalanceAndRefillRequirementsContext`, `useMasterWalletContext`, `usePageState`, `useAvailableAssets`). The chain-stability effect (skip sync on wallet pages) is an important branch. `getChainList` and `getMasterSafeAddress` are internal helpers — test through the provider.
- **`utils/wallet.ts`** — pure functions, no mocking needed. Test `tokenBalancesToSentence` with 0/1/2/3+ tokens, `getTokenDetails` with `AddressZero` and real token addresses, `getFromToken` with bridged tokens (`USDC.e` → `USDC`) and error cases.
