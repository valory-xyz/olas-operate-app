# On-Ramping

## Overview

The on-ramping system handles fiat-to-crypto purchases via Transak, then bridges the purchased tokens to the agent's operating chain. It manages the full flow: calculating how much crypto is needed, opening the Transak payment widget, detecting fund receipt, swapping/bridging tokens, and optionally creating a master safe.

The system has three layers:

1. **OnRampProvider** — context managing payment state, Transak IPC events, and fund receipt detection via balance polling
2. **Payment step hooks** — `useBuyCryptoStep` (Transak widget launch), `useSwapFundsStep` (bridge execution after purchase), `useCreateAndTransferFundsToMasterSafeSteps` (post-swap safe creation + transfer)
3. **Quote and requirements** — `useBridgeRequirementsQuery` (bridge quote polling + retry), `useBridgeRequirementsUtils` (token filtering), `PayingReceivingTable` (wire up native token calculation + fiat conversion + display)

```
OnRampProvider (payment state + IPC events + fund receipt detection)
  │
  ├── PayingReceivingTable (quote display)
  │     ├── useTotalNativeTokenRequired (see funding-and-refill doc)
  │     │     └── useBridgeRequirementsQuery (bridge quote polling + retry)
  │     │           └── useBridgeRequirementsUtils (token filtering)
  │     └── useTotalFiatFromNativeToken (see funding-and-refill doc)
  │
  └── OnRampPaymentSteps (step orchestration)
        ├── useBuyCryptoStep (Transak widget launch)
        ├── useSwapFundsStep (bridge execution after purchase)
        └── useCreateAndTransferFundsToMasterSafeSteps (safe creation + transfer)

OnRampIframe (Transak widget in Electron window)
```

## Source of truth

- `frontend/context/OnRampProvider.tsx` — on-ramp state, Transak IPC listeners, fund receipt detection
- `frontend/hooks/useOnRampContext.ts` — context accessor
- `frontend/hooks/useGetOnRampRequirementsParams.ts` — creates single `BridgeRequest` from token address + amount (deposit mode)
- `frontend/components/OnRamp/OnRamp.tsx` — main on-ramp UI component
- `frontend/components/OnRamp/OnRampPaymentSteps/OnRampPaymentSteps.tsx` — step orchestration (buy → swap → create safe → transfer)
- `frontend/components/OnRamp/OnRampPaymentSteps/useBuyCryptoStep.tsx` — buy crypto step (Transak widget interaction)
- `frontend/components/OnRamp/OnRampPaymentSteps/useSwapFundsStep.tsx` — swap funds step (bridge execution after purchase)
- `frontend/components/OnRamp/OnRampPaymentSteps/useCreateAndTransferFundsToMasterSafeSteps.tsx` — safe creation + fund transfer after swap
- `frontend/components/OnRamp/PayingReceivingTable/PayingReceivingTable.tsx` — paying/receiving display, wires up native token + fiat hooks
- `frontend/components/OnRamp/PayingReceivingTable/useBridgeRequirementsQuery.ts` — bridge quote polling + retry for on-ramp flow
- `frontend/components/OnRamp/hooks/useBridgeRequirementsUtils.ts` — receiving token derivation, native token filtering
- `frontend/hooks/useTotalNativeTokenRequired.ts` — total native token calculation with freeze logic (also in funding-and-refill doc)
- `frontend/hooks/useTotalFiatFromNativeToken.ts` — Transak price quote → fiat conversion with $5 buffer (also in funding-and-refill doc)
- `frontend/components/OnRamp/types.ts` — `OnRampMode`, `GetOnRampRequirementsParams`, `OnRampNetworkConfig`
- `frontend/components/OnRampIframe/OnRampIframe.tsx` — Transak iframe widget
- `frontend/pages/onramp.tsx` — Next.js page hosting the iframe
- `frontend/constants/onramp.ts` — `MIN_ONRAMP_AMOUNT`, `ON_RAMP_CHAIN_MAP`
- `frontend/constants/urls.ts` — `ON_RAMP_GATEWAY_URL` (Transak proxy)

## Contract / schema

### On-ramp chain mapping (`ON_RAMP_CHAIN_MAP`)

Maps each agent operating chain to its on-ramp source chain. Users buy crypto on the source chain, then bridge to the operating chain:

| Agent chain | On-ramp chain | Crypto |
|---|---|---|
| Gnosis | Base | ETH |
| Optimism | Optimism | ETH |
| Base | Base | ETH |
| Mode | Optimism | ETH |
| Polygon | Polygon | POL |

When the on-ramp chain matches the agent chain (e.g., Optimism, Base, Polygon), native tokens don't need bridging.

### Minimum on-ramp amount

`MIN_ONRAMP_AMOUNT = 5` (USD). The floor is enforced before the user enters the on-ramp flow in `OnRampMethodCard` and `SelectPaymentMethod`. `useTotalFiatFromNativeToken` still provides the buffered quote shown by the UI, but it does not enforce the minimum by itself.

### OnRampProvider context shape

Defined in `frontend/context/OnRampProvider.tsx`. Manages network config, payment amounts, buy-crypto button loading state, transaction lifecycle flags (`isOnRampingTransactionSuccessful`, `isTransactionSuccessfulButFundsNotReceived`, `isOnRampingStepCompleted`), and swap step completion.

### Transak iframe URL construction

The iframe URL is built from `ON_RAMP_GATEWAY_URL` with query params:

```
https://proxy.transak.autonolas.tech/?productsAvailed=BUY&paymentMethod=credit_debit_card&network={networkName}&cryptoCurrencyCode={cryptoCurrencyCode}&fiatCurrency=USD&fiatAmount={usdAmountToPay}&walletAddress={masterEoaAddress}&hideMenu=true
```

`walletAddress` is always the master EOA — funds are on-ramped to the EOA, then bridged/transferred to the safe.

### Transak IPC events

The Transak widget runs in a separate Electron window. Communication flows through IPC:

| Event | Direction | Trigger |
|---|---|---|
| `TRANSAK_WIDGET_CLOSE` | iframe → Electron | User closes widget |
| `TRANSAK_ORDER_SUCCESSFUL` | iframe → Electron | Payment succeeded (logged only) |
| `TRANSAK_ORDER_FAILED` | iframe → Electron | Payment failed → calls `onRampWindow.transactionFailure()` after 3s, then provider closes window after additional 0.5s |
| `onramp-transaction-failure` | Electron → renderer | Widget reports failure → resets loading state |
| `onramp-window-did-close` | Electron → renderer | Window closed → resets `isBuyCryptoBtnLoading` |

### Transak price quote

`PayingReceivingTable` uses `useTotalFiatFromNativeToken` to fetch the Transak quote and derive the buffered USD/native amounts shown in the flow. The request/response shape and buffer math are documented in `docs/features/funding-and-refill.md`.

### Bridge quote API

`useBridgeRequirementsQuery` uses `POST /api/bridge/bridge_refill_requirements` for the swap step. The request/response schema and bridge status model are documented in `docs/features/bridging.md`.

## Runtime behavior

### Fund receipt detection (OnRampProvider)

After a Transak purchase, the provider detects fund arrival by polling master EOA balances:

1. Captures `initialBalanceRef` when `nativeAmountToPay` is first set (before the user clicks "Buy Crypto")
2. On each balance update, compares current master EOA native balance to the initial balance
3. If balance increased by at least **90%** of `nativeAmountToPay` (`ETH_RECEIVED_THRESHOLD = 0.9`):
   - Sets `isOnRampingTransactionSuccessful = true`
   - Sets `hasFundsReceivedAfterOnRamp = true`
   - Resets `isBuyCryptoBtnLoading = false`
   - Closes the on-ramp window

The 90% threshold accounts for gas costs and price slippage during the on-ramp.

`isOnRampingStepCompleted` = `isOnRampingTransactionSuccessful && hasFundsReceivedAfterOnRamp`.

### IPC event handling (OnRampProvider)

Two IPC listeners run while the provider is mounted:

- **`onramp-transaction-failure`**: resets `isBuyCryptoBtnLoading`, sets `isOnRampingTransactionSuccessful = false`, closes window after 0.5s delay
- **`onramp-window-did-close`**: resets `isBuyCryptoBtnLoading` only (no transaction state change)

### State reset (OnRampProvider)

`resetOnRampState()` clears payment amounts (`nativeAmountToPay`, `usdAmountToPay`), loading flags, transaction state, and `initialBalanceRef`. It does **not** clear `nativeTotalAmountRequired` or `networkConfig` — those persist across resets and are only overwritten when the parent component sets them again. Automatically called with a 1-second delay when navigating to `PAGES.Main`.

### Back-navigation modal (OnRamp)

When the user clicks "back" during the on-ramp flow, a confirmation modal appears ("Are you sure you want to leave?"). If the user confirms:

1. Calls `resetOnRampState()` to clear all payment state
2. Navigates back to the previous page

This prevents accidental abandonment of in-progress transactions and ensures clean state on exit.

### Payment step orchestration (OnRampPaymentSteps)

Renders up to 4 transaction steps:

1. **Buy crypto** (`useBuyCryptoStep`) — always shown
2. **Swap funds** (`useSwapFundsStep`) — shown only if `tokensToBeBridged.length > 0` (skipped when on-ramp chain equals agent chain and only native token is needed)
3. **Create Pearl Wallet** (`useCreateAndTransferFundsToMasterSafeSteps`) — shown whenever master safe doesn't exist on the selected chain (not gated to onboarding)
4. **Transfer funds to Pearl Wallet** (same hook) — shown alongside step 3

**Completion detection**: all steps complete → either calls `onOnRampCompleted()` (deposit mode) or shows `AgentSetupCompleteModal` (onboard mode).

Completion guards:
- `isOnRampingStepCompleted` must be true
- If swap step exists (`tokensToBeBridged.length > 0`): `isSwappingFundsStepCompleted` must be true
- If safe creation steps exist: `isMasterSafeCreatedAndFundsTransferred` must be true

### Buy crypto step (`useBuyCryptoStep`)

Manages the Transak widget interaction:

1. User clicks "Buy crypto" → calls `onRampWindow.show(usdAmountToPay, networkName, cryptoCurrencyCode)`
2. After 1-second delay, sets `isBuyCryptoBtnLoading = true`
3. Button is disabled when `!masterEoa?.address || !usdAmountToPay`
4. Button shows loading when `isBuyCryptoBtnLoading || isTransactionSuccessfulButFundsNotReceived`

Step status:
- `finish` — `isOnRampingStepCompleted`
- `process` — `isTransactionSuccessfulButFundsNotReceived || isBuyCryptoBtnLoading`
- `wait` — otherwise

### Swap funds step (`useSwapFundsStep`)

Orchestrates bridge execution after the Transak purchase completes. Uses the on-demand bridge quote hook:

1. Waits for `isOnRampingStepCompleted`
2. Fetches bridge quote on-demand via `useBridgeRefillRequirementsOnDemand`
3. Extracts `quoteId` from the response
4. Feeds `quoteId` into `useBridgingSteps` to execute and poll
5. Updates `isSwappingFundsStepCompleted` in OnRamp context when bridging finishes
6. Preserves final `bridgeStatus` in local state so steps don't disappear on re-render

Returns a `SwapFundsStep` with `{ tokensToBeTransferred, tokensToBeBridged, step }` where `step` has sub-steps for each bridge operation.

### Safe creation and fund transfer (`useCreateAndTransferFundsToMasterSafeSteps`)

Runs after the swap step completes whenever no master safe exists on the selected chain (not gated to onboarding mode):

1. Checks if master safe exists on `selectedChainId`
2. If no safe: triggers `createMasterSafe()` after swap completes
3. Returns two steps: "Create Pearl Wallet" and "Transfer funds to the Pearl Wallet"
4. Both steps hidden when safe already exists

`isMasterSafeCreatedAndFundsTransferred` requires:
- No errors
- Safe created
- Transfer complete
- Token count matches transfer count (logs warning on mismatch)

### Bridge quote orchestration (`useBridgeRequirementsQuery`)

Handles quote fetching with polling and retry for the on-ramp flow:

1. Computes `bridgeParams` from `getOnRampRequirementsParams(isForceUpdate)`
2. Filters out native tokens via `getBridgeParamsExceptNativeToken` (when on-ramp chain equals agent chain)
3. Polls with `useBridgeRefillRequirements` at 30-second intervals
4. Manually refetches on mount via `useEffect`
5. Derives `receivingTokens` and `tokensToBeBridged` from params

**Retry flow** (`onRetry`):
1. Sets `force_update: true` on next request
2. Pauses polling
3. Adds 1-second delay
4. Refetches manually
5. On success: resets `force_update` to false, resumes polling

**Error state**: `hasError` is true when the query itself errors OR any `bridge_request_status` entry has `QUOTE_FAILED`.
The bridge quote request/response contract itself is documented in `docs/features/bridging.md`.

### Native token filtering (`useBridgeRequirementsUtils`)

When the on-ramp chain equals the destination chain (`canIgnoreNativeToken = true`), the native token doesn't need bridging. This hook provides:

- `getReceivingTokens(bridgeParams)` — maps each bridge request's `to.token` to `{ amount, symbol }` using token config
- `getTokensToBeBridged(receivingTokens)` — filters out the native token symbol when `canIgnoreNativeToken`
- `getBridgeParamsExceptNativeToken(bridgeParams)` — filters out `AddressZero` from bridge requests when `canIgnoreNativeToken`

### PayingReceivingTable

Wires up the quote display pipeline:

1. Calls `useTotalNativeTokenRequired` to get total native token needed + receiving tokens
2. Calls `useTotalFiatFromNativeToken` to convert to USD (skipped when on-ramping already in progress)
3. Freezes displayed `tokensRequired` once `isTransactionSuccessfulButFundsNotReceived` or `isOnRampingStepCompleted` becomes true (prevents UI flicker during/after payment)
4. Updates `usdAmountToPay` in OnRamp context (only while not yet paying)

The calculation details for `useTotalNativeTokenRequired`, `useTotalFiatFromNativeToken`, and `useGetOnRampRequirementsParams` are documented in `docs/features/funding-and-refill.md`.

### On-ramp requirements params (`useGetOnRampRequirementsParams`)

This hook creates the single deposit-mode `BridgeRequest` used by the on-ramp quote flow. The exact parameter shape, address selection, and token rules are documented in `docs/features/funding-and-refill.md`.

## Failure / guard behavior

- **OnRampProvider fund detection** — relies on balance polling via `useMasterBalances`. If balances stop updating (offline, polling paused), fund receipt is never detected. The 90% threshold means small on-ramp amounts near dust levels may not trigger detection.
- **OnRampProvider initial balance capture** — `initialBalanceRef` is set only once (first time `nativeAmountToPay` is set). If the ref is already set, subsequent `nativeAmountToPay` changes don't re-capture, which could lead to incorrect balance diff calculations if the flow restarts without `resetOnRampState()`.
- **OnRampProvider auto-reset** — calls `resetOnRampState()` with a 1-second delay on `PAGES.Main` navigation. If the user navigates away and back quickly, the timer may fire after the new flow starts.
- **OnRamp component** — renders a `<Loader>` spinner when `networkId` is null. Does not throw.
- **PayingReceivingTable** — throws `Error` if `selectedChainId` is null in OnRamp context.
- **useCreateAndTransferFundsToMasterSafeSteps** — throws `Error` if `selectedChainId` is null. Returns empty steps array when safe already exists (deposit mode).
- **useCreateAndTransferFundsToMasterSafeSteps completion check** — logs a warning and returns false if `tokensToBeTransferred.length !== transfers.length` (token count mismatch).
- **useBuyCryptoStep** — "Buy crypto" button disabled when `!masterEoa?.address || !usdAmountToPay`. `handleBuyCrypto` returns early without action if `onRampWindow.show`, `usdAmountToPay`, `networkName`, or `cryptoCurrencyCode` are falsy.
- **useSwapFundsStep** — waits for `isOnRampingStepCompleted` before fetching the bridge quote. Returns empty/wait state until on-ramping finishes.
- **useBridgeRequirementsQuery** — disabled when `enabled` is false. Stops polling when `stopPollingCondition` is true. Mount fetch fires only once (`isBridgeRefillRequirementsApiLoading` flag).
- **useBridgeRequirementsUtils** — `getReceivingTokens` returns empty array when `bridgeParams` or `selectedChainId` is null. Throws if token config lookup fails (via `getTokenDetails`).
- **OnRampIframe** — returns `<Spin>` when URL can't be constructed (missing masterEoa, networkName, or cryptoCurrencyCode). Listens to `message` events from iframe — only processes events from its own iframe's `contentWindow`.
- **Transak order failure** — `TRANSAK_ORDER_FAILED` triggers `onRampWindow.transactionFailure()` after a 3-second delay in the iframe. This fires the `onramp-transaction-failure` IPC event, which the provider handles by resetting loading state and closing the window after an additional 0.5-second delay — total of ~3.5s from failure to window close.

## Test-relevant notes

- `OnRampProvider` fund receipt detection uses a 90% threshold and BigInt comparison — test with amounts near the threshold boundary. Test that `initialBalanceRef` is captured only once.
- `OnRampProvider` IPC listeners — mock `ipcRenderer.on` and verify `onramp-transaction-failure` resets state and `onramp-window-did-close` resets loading only.
- `OnRampProvider` auto-reset on `PAGES.Main` — test the 1-second delay timer and that `resetOnRampState` clears all state including `initialBalanceRef`.
- `OnRampPaymentSteps` completion has three independent guards — test that all three must pass. In deposit mode, test that `onOnRampCompleted` is called; in onboard mode, test that `AgentSetupCompleteModal` appears.
- `OnRampPaymentSteps` conditionally renders swap step — test that it's omitted when `tokensToBeBridged.length === 0`.
- `useBuyCryptoStep` has four status paths (wait → process → finish) — test that `isTransactionSuccessfulButFundsNotReceived` shows process state.
- `useSwapFundsStep` sequences through wait → process → finish/error — test that `quoteId` is only extracted after `isOnRampingStepCompleted`.
- `useCreateAndTransferFundsToMasterSafeSteps` returns empty steps when safe exists — test both onboard (no safe) and deposit (has safe) paths.
- `useCreateAndTransferFundsToMasterSafeSteps` completion check compares array lengths — test with mismatched token/transfer counts.
- `useBridgeRequirementsQuery` retry flow toggles `force_update`, pauses polling, and resumes — test the full lifecycle.
- `useBridgeRequirementsUtils.canIgnoreNativeToken` depends on `selectedChainId === onRampChainId` — test with matching chains (Optimism→Optimism) and non-matching (Base→Gnosis).
- `getBridgeParamsExceptNativeToken` filters `AddressZero` only when `canIgnoreNativeToken` — test that all requests pass through when chains differ.
- `PayingReceivingTable` freezes `tokensRequired` in state — test that displayed tokens don't change after `isTransactionSuccessfulButFundsNotReceived` or `isOnRampingStepCompleted` (NOT when `isBuyCryptoBtnLoading` becomes true).
- `PayingReceivingTable` updates `usdAmountToPay` to null during loading — test the loading→ready transition.
- `OnRampIframe` URL construction — test query param generation with various inputs. Test that it returns spinner when required params are missing.
- `ON_RAMP_CHAIN_MAP` — verify each agent chain maps to the correct on-ramp chain and crypto currency.
- `OnRamp` back-navigation modal — test that `resetOnRampState()` is called on confirm, and that the modal prevents accidental exit.
- `OnRampProvider.resetOnRampState()` — test that it clears `nativeAmountToPay`, `usdAmountToPay`, loading flags, transaction state, and `initialBalanceRef`, but does NOT clear `nativeTotalAmountRequired` or `networkConfig`.
- `MIN_ONRAMP_AMOUNT` floor — test that `useTotalFiatFromNativeToken` returns at least $5 regardless of computed amount.
- `useCreateAndTransferFundsToMasterSafeSteps` has no mode gate — test that safe creation steps appear in both onboard and deposit mode when safe doesn't exist.
- `useTotalNativeTokenRequired`, `useTotalFiatFromNativeToken`, and `useGetOnRampRequirementsParams` are covered in the funding-and-refill doc — test notes there apply.
