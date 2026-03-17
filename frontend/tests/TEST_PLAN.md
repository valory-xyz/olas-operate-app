# Test Coverage Plan: 0% → 100%

## Context

Pearl frontend has **577 files** tracked by Jest coverage, nearly all at 0% (only `numberFormatters.ts` partially tested). This plan is organized by feature domains, ordered by dependency layers — test foundations first, then features that depend on them. Each phase = one PR.

## Coverage scope

`jest.config.ts` collects from **all** `.ts/.tsx` files, excluding only:
- `*.d.ts`, `*.test.*`, `tests/`, `.next/`, `node_modules/`, `jest.config.ts`, `jest.setup.ts`, `next.config.mjs`

## File categories

| Category | Files | Has logic? |
|----------|-------|------------|
| `utils/` | 23 | Yes — pure functions |
| `hooks/` | 50+ | Yes — derivation + side effects |
| `context/` | 20+ | Yes — providers with state |
| `service/` | 18 | Yes — API clients + agent services |
| `config/` | 13 | Some — providers, agents have logic |
| `components/` (with hooks/context) | ~20 | Yes — embedded business logic |
| `components/` (pure UI) | ~60 | UI only — render tests |
| `constants/` | 26 | No — pure data |
| `types/` | 16 | No — pure TypeScript types |
| `abis/` | 13 | No — pure ABI exports |
| `pages/` | 5 | Minimal — Next.js wrappers |

## Backend API reference

The middleware API docs (endpoint URLs, request/response shapes, error formats) live upstream at https://github.com/valory-xyz/olas-operate-middleware/blob/main/docs/api.md. Consult when testing service files in Phase 2+.

## Feature documentation reference

Each phase has corresponding feature documentation in `docs/features/`. **Always read the relevant feature doc(s) before writing tests for a phase** — they describe runtime behavior, state transitions, failure modes, edge cases, and test-relevant notes that inform what to assert.

| Phase | Feature doc(s) |
|-------|---------------|
| 0 | (none — pure utilities) |
| 1 | `electron-api.md`, `dynamic-polling.md`, `feature-flags.md`, `support-and-logs.md` (partial — most Phase 1 files are thin wrappers) |
| 2 | `account.md`, `wallet.md` |
| 3 | `balance.md`, `services.md` |
| 4 | `staking-and-rewards.md` |
| 5 | `funding-and-refill.md` |
| 6 | `bridging.md`, `on-ramping.md`, `funding-and-refill.md` |
| 7 | `deployability-and-lifecycle.md`, `achievements.md`, `agent-settings.md`, `services.md`, `account.md` |
| 8 | [`frontend/context/AutoRunProvider/docs/auto-run.md`](../context/AutoRunProvider/docs/auto-run.md) |
| 9 | (none — static data) |
| 10 | (refer to phase-specific docs for the feature each component belongs to) |

## Dependency Order

```
Layer 0: Shared Utilities, Config (no deps — excludes domain-specific utils)
Layer 1: App Infrastructure (thin wrappers, providers, main page hooks)
Layer 2: Account, Wallet, Recovery (core identity + wallet ops + components)
Layer 3: Balance, Services (core data providers)
Layer 4: Staking, Rewards (contract interactions + staking components)
Layer 5: Funding, Refill Requirements (aggregation logic + setup components)
Layer 6: Bridging, On-ramping (cross-chain/fiat flows + all related components)
Layer 7: Deployability, Service Lifecycle, Agent Updates (orchestration + components)
Layer 8: Auto-run (depends on everything)
Layer 9: Static Data, Types, ABIs
Layer 10: Remaining Component UI + Pages (rendering)
```

---

## Phase 0 — Shared Utilities & Config `[EASY]` ✅ COMPLETE

**Goal:** Cover all pure generic functions. Establishes test patterns.

**Result:** 22 test files, 230 tests, all passing, 0 lint errors.

**Shared test infrastructure:**
- `helpers/factories.ts` — factories and constants for all phases:
  - **Wallet factories:** `makeMasterEoa`, `makeMasterSafe`, `makeMultisigOwners`
  - **Service factories:** `makeService` (Service type), `makeChainConfig` (chain_configs entry), `makeMiddlewareService` (MiddlewareServiceResponse), `makeAgentService` (agent-config-aware, accepts `AGENT_CONFIG[AgentMap.X]`)
  - **Staking factories:** `makeStakingContractDetails`, `makeServiceStakingDetails`, `makeRawStakingRewardsInfo`, `makeStakingRewardsInfo`, `makeRewardsHistoryEntry`, `makeRewardsHistoryServiceResponse`
  - **Address constants:** `DEFAULT_EOA_ADDRESS`, `DEFAULT_SAFE_ADDRESS`, `BACKUP_SIGNER_ADDRESS`, `MOCK_INSTANCE_ADDRESS`, `MOCK_MULTISIG_ADDRESS`, etc.
  - **Config ID constants:** `DEFAULT_SERVICE_CONFIG_ID`, `MOCK_SERVICE_CONFIG_ID_2`/`_3`/`_4`
  - **Staking constants:** `DEFAULT_STAKING_PROGRAM_ID`, `SECOND_STAKING_PROGRAM_ID`, `DEFAULT_STAKING_CONTRACT_ADDRESS`, `SECOND_STAKING_CONTRACT_ADDRESS`, `DEFAULT_SERVICE_NFT_TOKEN_ID`
  - **Service public IDs:** `SERVICE_PUBLIC_ID_MAP` (matches real `AGENT_CONFIG` values)
  - **Sentinels:** `INVALID_CHAIN_ID`, `UNKNOWN_TOKEN_ADDRESS`, `ALL_EVM_CHAIN_IDS`
  - All phases should use these instead of inline hex strings or local config ID constants.
- `mocks/ethersMulticall.ts` — shared `ethers-multicall` module mock (used via `jest.mock` + `require`).
- `mocks/servicesService.ts` — shared `ServicesService` module mock (used via `jest.mock` + `require`).

**Test authoring rules (all later phases):**
- If a value already exists in `helpers/factories.ts`, do not restate it in a test. Override only the field that matters to the behavior under test.
- If a suite needs a convenience helper, keep it as a thin wrapper over shared factories (for example `serviceFor(agentType, overrides)`), not a second source of truth.
- Provider tests should own query wiring, enable/disable guards, polling, refetch, and merge behavior. Consumer hook tests should focus on derivation. Component tests should focus on rendering/interaction with mocked hooks. Do not repeat the same branch matrix across all three layers.
- When a payload shape appears in two suites, promote it into `helpers/factories.ts` before adding more inline literals.
- Reviews should flag misleading tests that only restate imported constants or default context values without exercising the implementation branch they are named after.

**Note:** Most Phase 0 files are pure functions tested without mocks. Three files (`service.ts`, `setupMulticall.ts`, `config/providers.ts`) require mocking external modules (`ServicesService`, `ethers-multicall`, `constants/providers`) due to side effects at import time.

**Utilities (20 files):**
- ✅ `utils/numberFormatters.ts` — 100% (was 46%)
- ✅ `utils/address.ts` — 100%
- ✅ `utils/truncate.ts` — 100%
- ✅ `utils/calculations.ts` — 100%
- ✅ `utils/time.ts` — 100%
- ✅ `utils/dateFormatter.ts` — 100%
- ✅ `utils/delay.ts` — 100% (needs `jest.useFakeTimers()` for `sleepAwareDelay`)
- ✅ `utils/backoff.ts` — 100%
- ✅ `utils/error.ts` — 100%
- ✅ `utils/lodashExtensions.ts` — 100%
- ✅ `utils/middlewareHelpers.ts` — 100% (including `getTokenDetailsFromAddress`)
- ✅ `utils/sanitizeHtml.ts` — 100%
- ✅ `utils/copyToClipboard.ts` — 100%
- ✅ `utils/abi.ts` — 100%
- ✅ `utils/safe.ts` — 100%
- ✅ `utils/service.ts` — 100% (`updateServiceIfNeeded`/`onDummyServiceCreation` tested with mocked `ServicesService`)
- ✅ `utils/x.ts` — 100%
- ✅ `utils/generateAgentName/computeAgentId.ts` — 100%
- ✅ `utils/generateAgentName/generateAgentName.ts` — 99% (unreachable `normalizeToSeedHex64` null branch)
- ✅ `utils/setupMulticall.ts` — 93.5% (unreachable error for hardcoded addresses; needs `jest.mock('ethers-multicall')` + `jest.mock('../../constants/providers')` to break circular dep)

**Config (2 files):**
- ✅ `config/providers.ts` — structure validation (needs `ethers-multicall` mock with `Contract` constructor)
- ✅ `config/agents.ts` — structure validation (`AGENT_CONFIG`, `ACTIVE_AGENTS`, `AVAILABLE_FOR_ADDING_AGENTS`)

**Observations for later phases:**
- `constants/providers.ts` calls `setupMulticallAddresses()` at module scope, creating circular deps. Mock `ethers-multicall` (with `Contract`) and/or `constants/providers` in tests that transitively import `@/constants`.
- Service-related tests that import `config/agents.ts` pull in agent service classes, which need `ethers-multicall` `Contract` mocked.
- `utils/service.ts` `updateServiceIfNeeded` has complex env_variable diffing logic — mocking `SERVICE_TEMPLATES` and `ServicesService` keeps tests focused.
---

## Phase 1 — App Infrastructure `[EASY-MEDIUM]` ✅ COMPLETE

**Goal:** Cover infrastructure hooks/providers and main page hooks that everything else depends on.

**Result:** 23 test files, 166 tests, all passing, 0 lint errors.

**Context accessors (generic infra only):**
- ✅ `hooks/useElectronApi.ts`
- ✅ `hooks/useStore.ts`
- ✅ `hooks/useOnlineStatus.ts`
- ✅ `hooks/usePageState.ts`
- ✅ `hooks/useSettings.ts`
- ✅ `hooks/useServices.ts`
- ✅ `hooks/useSharedContext.ts`

**Providers:**
- ✅ `context/ElectronApiProvider.tsx` — Electron IPC bridge
- ✅ `context/StoreProvider.tsx` — store sync + IPC listener
- ✅ `context/OnlineStatusProvider.tsx` — online/offline events
- ✅ `context/PageStateProvider.tsx` — page navigation
- ✅ `context/MessageProvider.tsx` — toast messages
- ✅ `context/SettingsProvider.tsx` — settings screen state
- ✅ `context/SupportModalProvider.tsx` — support modal state

**Hooks with logic:**
- ✅ `hooks/usePause.ts` — pause/resume state
- ✅ `hooks/useDynamicRefetchInterval.ts` — adaptive polling intervals
- ✅ `hooks/useFeatureFlag.ts` — feature flag fetching + validation
- ✅ `hooks/useGlobalErrorHandlers.ts` — global error listeners
- ✅ `hooks/useLogs.ts` — log aggregation

**MainPage hooks (app-level concerns):**
- ✅ `components/MainPage/hooks/useNotifyOnAgentRewards.ts` — reward notifications
- ✅ `components/MainPage/hooks/useNotifyOnNewEpoch.ts` — epoch notifications (12 guard conditions)
- ✅ `components/MainPage/hooks/useScrollPage.ts` — scroll to top on navigation
- ✅ `components/MainPage/hooks/useSetupTrayIcon.ts` — tray icon status logic

**Observations for later phases:**
- `useLogs` depends on `useMultisigs`, `useBalanceContext`, `useMasterWalletContext`, `useServices` — all mocked in Phase 1, will be tested directly in Phases 2-3.
- `useFeatureFlag` uses Zod validation at module scope — `FEATURES_CONFIG` is validated on import. Modius has `backup-via-safe: false` while all other agents have it `true`.
- `useNotifyOnNewEpoch` has 12 guard conditions — each tested independently. Depends on auto-run context, staking, balance, and service hooks.
- `useDynamicRefetchInterval` requires `jest.spyOn(document, 'hasFocus')` since jsdom returns `false` by default.
- `useGlobalErrorHandlers` requires a `PromiseRejectionEvent` polyfill (jsdom lacks it).

---

## Phase 2 — Account & Wallet Management `[MEDIUM]` ✅ COMPLETE

**Goal:** Cover account lifecycle, wallet operations, and recovery — including related components.

**Account:**
- ✅ `service/Account.ts` — account creation, login, password
- ✅ `hooks/useValidatePassword.ts` — password validation
- ✅ `hooks/useMnemonicExists.ts` — mnemonic check
- ✅ `hooks/useRecoveryPhraseBackup.ts` — backup status
- ✅ `hooks/useSetup.ts` — setup flow sync
- ✅ `hooks/useBackupSigner.ts` — backup signer info
- ✅ `context/SetupProvider.tsx` — setup context
- ✅ `service/Recovery.ts` — recovery operations

**Wallet:**
- ✅ `hooks/useWallet.ts` — wallet context accessor
- ✅ `utils/wallet.ts` — wallet helpers
- ✅ `service/Wallet.ts` — EOA/Safe creation, mnemonic
- ✅ `context/MasterWalletProvider.tsx` — master wallet state
- ✅ `context/PearlWalletProvider.tsx` — wallet chain context, deposit/withdraw state (353 lines)
- ✅ `hooks/useMultisig.ts` — multisig owners via multicall
- ✅ `hooks/useMasterSafeCreationAndTransfer.ts` — safe creation + transfers

**Account Recovery (components):**
- ✅ `components/AccountRecovery/hooks/useWeb3AuthSwapOwner.ts` — web3auth swap owner hook
- ✅ `components/AccountRecovery/components/ApproveWithBackupWallet/` — approval logic

**Wallet components:**
- ✅ `components/AgentWallet/` — wallet display, fund agent, withdraw
- ✅ `components/PearlWallet/` — wallet withdraw flow

---

## Phase 3 — Balance & Services `[MEDIUM-HARD]` ✅ COMPLETE

**Goal:** Cover the two core data providers that almost every feature depends on.

**Result:** 17 test files, 445+ tests, all passing, 0 lint/tsc errors.

**Balance:**
- ✅ `hooks/useBalanceContext.ts` — balance context accessor (4 tests)
- ✅ `hooks/useBalanceAndRefillRequirementsContext.ts` — refill requirements context accessor (7 tests)
- ✅ `service/Balance.ts` — balance API client (~20 tests)
- ✅ `context/BalanceProvider/utils.ts` — balance calculation utilities (~60 tests)
- ✅ `context/BalanceProvider/BalanceProvider.tsx` — balance state + polling (28 tests)
- ✅ `hooks/useMasterBalances.ts` — master wallet balances (~25 tests)
- ✅ `hooks/useServiceBalances.ts` — service wallet balances (~15 tests)
- ✅ `hooks/useAvailableAssets.ts` — available master assets (34 tests)
- ✅ `hooks/useAvailableAgentAssets.ts` — available agent assets (45 tests)

**Services:**
- ✅ `service/Services.ts` — service CRUD + deployment API (~30 tests)
- ✅ `context/ServicesProvider.tsx` — services state + polling (41 tests)
- ✅ `context/PearlWalletProvider.tsx` — wallet chain context (62 tests)
- ✅ `hooks/useService.ts` — single service details (~40 tests)
- ✅ `hooks/useAgentRunning.ts` — running agent detection (~15 tests)
- ✅ `hooks/useAgentActivity.ts` — deployment status (~10 tests)
- ✅ `hooks/useIsInitiallyFunded.ts` — initial funding flag (~10 tests)
- ✅ `hooks/useIsAgentGeoRestricted.ts` — geo restriction check (~10 tests)

**Behaviors/bugs caught:**
- `sumBigNumbers` returns `.0` suffix (e.g. `"5000000000000000000.0"`)
- `CREATED` deployment status (value `0`) is falsy — `isServiceBuilding` is false for CREATED
- `useAgentRunning` requires exact `service_public_id` + `home_chain` match from `ACTIVE_AGENTS`

**Factory consolidation:**
- Shared `makeChainConfig(chain, overrides)` — builds chain_configs entry, supports `undefined` instances/multisig via `'key' in overrides` pattern
- Shared `makeMiddlewareService(chain, overrides)` — builds MiddlewareServiceResponse
- Shared `makeAgentService(agentConfig, overrides)` — accepts `Pick<AgentConfig, ...>` to avoid importing `config/agents` in factories
- `MOCK_SERVICE_CONFIG_ID_3`/`_4` replace all local config ID constants
- `SERVICE_PUBLIC_ID_MAP` values fixed to match real `AGENT_CONFIG` values
- ServicesProvider.test.tsx uses `serviceFor(AgentMap.X)` thin wrapper over shared factories
- useService.test.ts `makeFullService` delegates to `makeChainConfig`; inlined chain_configs replaced with one-liner overrides

**Observations for later phases:**
- `config/agents.ts` can't be imported directly in factories.ts (triggers `parseEther` via service templates). Use `makeAgentService(AGENT_CONFIG[AgentMap.X])` pattern instead — callers import `AGENT_CONFIG`, factory accepts the config object.
- `config/chains.ts` also uses `parseEther` — must be mocked in tests that import it transitively.
- `config/providers.ts` mock (`{ providers: [] }`) needed when import chain touches `BalanceProvider` or `BalancesAndRefillRequirementsProvider`.

---

## Phase 4 — Staking & Rewards `[HARD]` ✅ COMPLETE

**Goal:** Cover the staking system — programs, contracts, eligibility, rewards — including staking-related components.

**Result:** 23 test files, 411 tests, all passing, 0 lint errors.

**Execution order (keep these as separate Claude-sized batches, not one sweep):**
1. Foundations: `utils/stakingProgram.ts`, `utils/stakingRewards.ts`, `config/stakingPrograms/index.ts`, `hooks/useRewardContext.ts`, `hooks/useStakingProgram.ts`, `context/StakingProgramProvider.tsx`
2. Contract state: `hooks/useStakingContracts.ts`, `hooks/useStakingContractDetails.ts`, `hooks/useStakingContractCountdown.ts`, `hooks/useStakingDetails.ts`, `hooks/useActiveStakingProgramId.ts`, `context/StakingContractDetailsProvider.tsx`
3. Rewards data: `hooks/useAgentStakingRewardsDetails.ts`, `hooks/useStakingRewardsOf.ts`, `hooks/useRewardsHistory.ts`, `context/RewardProvider.tsx`
4. Agent service hierarchy: `StakedAgentService`, `AgentsFun`, `PredictTrader`, `Modius`, `Optimism`, `PettAi`, `Polystrat`, `AgentsFunBase`
5. UI-facing staking logic: `components/AgentStaking/`, `components/ConfirmSwitch/hooks/useShouldAllowStakingContractSwitch.ts`, `components/SelectStakingPage/hooks/useCanMigrate.ts`, `components/SelectStakingPage/hooks/useStakingDetails.ts`

**Required shared fixtures before adding more Phase 4 suites:**
- Use `makeStakingContractDetails` and `makeServiceStakingDetails` for contract-detail/provider tests instead of suite-local staking payload builders.
- Use `makeRawStakingRewardsInfo` for service-api responses and `makeStakingRewardsInfo` for already-parsed hook/provider values.
- Use `makeRewardsHistoryEntry` and `makeRewardsHistoryServiceResponse` for subgraph payloads; do not inline GraphQL objects in each test file.
- Use `DEFAULT_STAKING_PROGRAM_ID`, `SECOND_STAKING_PROGRAM_ID`, `DEFAULT_STAKING_CONTRACT_ADDRESS`, and `DEFAULT_SERVICE_NFT_TOKEN_ID` instead of retyping program ids, addresses, and token ids.

**Phase 4 review rules:**
- Test documented quirks exactly once at the lowest layer that owns them. Examples: `availableRewards ?? 0 > 0` precedence in `useStakingContractDetails`, streak stopping at the first missed epoch in `useRewardsHistory`, and optimistic reward calculation in `RewardProvider`.
- `StakingProgramProvider` owns fallback priority. Downstream hook/component suites should mock the provider state instead of rebuilding the same active/service/default-selection matrix.
- `StakingContractDetailsProvider` owns query strategy differences. Hook tests should cover derived booleans; they should not duplicate provider polling assertions.
- `RewardProvider` owns optimistic reward and store persistence. Component tests should consume those outputs, not re-test Electron store writes.
- For the agent service class hierarchy, keep shared base-contract behavior in the `StakedAgentService` suite and limit subclass suites to chain/program-specific overrides.

**Staking utils & config:**
- `utils/stakingProgram.ts` — staking program helpers
- `utils/stakingRewards.ts` — reward calculations
- `config/stakingPrograms/index.ts` — program aggregation

**Staking hooks & providers:**
- `hooks/useStakingProgram.ts` — program metadata
- `hooks/useStakingContracts.ts` — available contracts
- `hooks/useStakingContractDetails.ts` — contract details + eligibility
- `hooks/useStakingContractCountdown.ts` — countdown timer
- `hooks/useStakingDetails.ts` — staking state details
- `hooks/useActiveStakingProgramId.ts` — active program detection
- `hooks/useStakingRewardsOf.ts` — rewards per contract
- `hooks/useAgentStakingRewardsDetails.ts` — agent-specific rewards
- `context/StakingProgramProvider.tsx` — staking program context
- `context/StakingContractDetailsProvider.tsx` — staking details context

**Rewards:**
- `hooks/useRewardContext.ts` — reward context accessor
- `hooks/useRewardsHistory.ts` — GraphQL subgraph query + epoch grouping
- `context/RewardProvider.tsx` — rewards state + optimistic calculation

**Agent Services (staking logic — class hierarchy):**
```
StakedAgentService (abstract base)
    ├── PredictTrader
    ├── Modius
    ├── Optimism
    ├── PettAi
    ├── Polystrat
    └── AgentsFunBase
            └── AgentsFun
```
- `service/agents/shared-services/StakedAgentService.ts` — base staking class
- `service/agents/shared-services/AgentsFun.ts` — AgentsFun staking
- `service/agents/PredictTrader.ts`
- `service/agents/Modius.ts`
- `service/agents/Optimism.ts`
- `service/agents/PettAi.ts`
- `service/agents/Polystrat.ts`
- `service/agents/AgentsFunBase.ts`

**Staking components:**
- `components/AgentStaking/` — staking display logic
- `components/ConfirmSwitch/hooks/useShouldAllowStakingContractSwitch.ts` — switch eligibility hook
- `components/SelectStakingPage/hooks/useCanMigrate.ts` — migration eligibility hook
- `components/SelectStakingPage/hooks/useStakingDetails.ts` — staking details hook

---

## Phase 5 — Funding & Refill Requirements `[MEDIUM-HARD]` ✅ COMPLETE

**Goal:** Cover the funding logic — what tokens are needed, how much, and where — including setup funding components.

**Result:** 10 test files, 167 tests, all passing, 0 lint errors.

- `hooks/useGetRefillRequirements.ts` — requirement aggregation + formatting
- `hooks/useAgentFundingRequests.tsx` — agent funding needs consolidation
- `hooks/useInitialFundingRequirements.ts` — first-time funding
- `hooks/useGetBridgeRequirementsParams.ts` — bridge requirement params
- `hooks/useGetOnRampRequirementsParams.ts` — on-ramp requirement params
- `context/BalancesAndRefillRequirementsProvider/BalancesAndRefillRequirementsProvider.tsx` — consolidated provider
- `service/Fund.ts` — fund API client
- `hooks/useTotalNativeTokenRequired.ts` — total native token calc with freeze logic
- `hooks/useTotalFiatFromNativeToken.ts` — fiat price conversion

**Funding components:**
- `components/SetupPage/FundYourAgent/hooks/` — funding setup hooks

**Bug fix:** `useGetRefillRequirements.ts` — replaced `isEmpty(totalTokenRequirements)` guard with `totalTokenRequirements === null` to prevent infinite re-renders when `getRequirementsPerToken` returns `[]` (since `isEmpty([])` is `true`, causing the effect to re-run every cycle).

---

## Phase 6 — Bridging & On-ramping `[MEDIUM-HARD]` ✅ COMPLETE

**Goal:** Cover the cross-chain and fiat-to-crypto flows — hooks, services, context, AND components together.

**Bridging (hooks & service):**
- `service/Bridge.ts` — bridge API client
- `hooks/useBridgingSteps.ts` — bridge execution workflow + polling
- `hooks/useBridgeRefillRequirements.ts` — bridge requirements polling
- `hooks/useBridgeRefillRequirementsOnDemand.ts` — on-demand bridge query

**Bridging (components):**
- `components/Bridge/Bridge.tsx` — bridge entry component
- `components/Bridge/BridgeTransferFlow.tsx` — transfer flow
- `components/Bridge/BridgeInProgress/BridgeInProgress.tsx` — progress display
- `components/Bridge/BridgeInProgress/BridgingSteps.tsx` — step display
- `components/Bridge/BridgeInProgress/useRetryBridge.ts` — retry logic hook
- `components/Bridge/BridgeInProgress/useMasterSafeCreateAndTransferSteps.ts` — safe transfer steps hook
- `components/Bridge/BridgeOnEvm/BridgeOnEvm.tsx` — EVM bridge
- `components/Bridge/BridgeOnEvm/DepositForBridging.tsx` — deposit for bridge

**On-ramping (hooks & context):**
- `hooks/useOnRampContext.ts` — on-ramp context accessor
- `context/OnRampProvider.tsx` — on-ramp flow state (310 lines)

**On-ramping (components):**
- `components/OnRamp/OnRamp.tsx` — on-ramp entry component
- `components/OnRamp/hooks/useBridgeRequirementsUtils.ts` — bridge requirements utils hook
- `components/OnRamp/OnRampPaymentSteps/OnRampPaymentSteps.tsx` — payment steps
- `components/OnRamp/OnRampPaymentSteps/useBuyCryptoStep.tsx` — buy crypto step hook
- `components/OnRamp/OnRampPaymentSteps/useCreateAndTransferFundsToMasterSafeSteps.tsx` — transfer steps hook
- `components/OnRamp/OnRampPaymentSteps/useSwapFundsStep.tsx` — swap funds step hook
- `components/OnRamp/PayingReceivingTable/PayingReceivingTable.tsx` — payment table
- `components/OnRamp/PayingReceivingTable/useBridgeRequirementsQuery.ts` — bridge query hook
- `components/OnRampIframe/OnRampIframe.tsx` — iframe wrapper

**Deposit flow (related):**
- `components/PearlDeposit/Deposit/Deposit.tsx` — deposit component
- `components/PearlDeposit/SelectPaymentMethod/SelectPaymentMethod.tsx` — payment method selection
- `components/PearlDeposit/SelectPaymentMethod/BridgeCryptoOn.tsx` — bridge option
- `components/PearlDeposit/SelectPaymentMethod/OnRampCryptoOn.tsx` — on-ramp option
- `components/PearlDeposit/SelectPaymentMethod/TransferCryptoOn.tsx` — transfer option

---

## Phase 7 — Deployability & Service Lifecycle `[HARD]` ✅ COMPLETE

**Goal:** Cover the deployment decision tree, service start/stop orchestration, agent updates, and achievements — including related components. Achievement feature doc: `docs/features/achievements.md`.

**Result:** 13 test files, 146 tests, all passing, 0 lint/TS errors. Total: 148 suites, 2273 tests.

- ✅ `hooks/useDeployability.ts` — 36 tests: all 14 branches, loading reason accumulation, branch priority
- ✅ `hooks/useStartService.ts` — 12 tests: existing service path, creation path, mech type, error cases
- ✅ `hooks/useServiceDeployment.ts` — 24 tests: isLoading, isDeployable, handleStart flow, error recovery, polling control, createSafeIfNeeded callback (HasSafe, Ready, canProceed=false, missing backupOwner)
- ✅ `service/Settings.ts` — 5 tests: fetch, AbortSignal, error paths
- ✅ `service/Achievement.ts` — 10 tests: 3 API functions (get, acknowledge, generateImage)
- ✅ `service/Support.ts` — 12 tests: uploadFile, createTicket, discriminated union returns, error handling
- ✅ `context/SharedProvider/SharedProvider.tsx` — 9 tests: AgentsFun env var checks, animation state

**Achievement components:**
- ✅ `components/AchievementModal/hooks/useAchievements.ts` — 7 tests: query config, polling, error logging
- ✅ `components/AchievementModal/hooks/useCurrentAchievement.ts` — 9 tests: cycling, 1-minute delay, timeout cleanup, unmount cleanup
- ✅ `components/AchievementModal/hooks/useTriggerAchievementBackgroundTasks.ts` — 6 tests: parallel mutations, data ID extraction, achievement_type split, error handling

**Agent update components:**
- ✅ `components/UpdateAgentPage/hooks/useModal.ts` — 5 tests: open/close, cancel, confirm
- ✅ `components/UpdateAgentPage/hooks/useConfirmModal.ts` — 7 tests: callback, restart, pending state, error paths
- ✅ `components/UpdateAgentPage/hooks/useUnsavedModal.ts` — 3 tests: confirm callback, cancel

---

## Phase 8 — Auto-run System `[VERY HARD]` ✅ COMPLETE

**16 test suites, 200 tests.**

**Goal:** Cover the most complex subsystem — agent rotation, scanning, eligibility, signals, lifecycle.

**Internal dependency chain (test in this order):**
```
utils.ts + autoRunHelpers.ts (pure)
         │
         ▼
useAutoRunStore + useConfiguredAgents
         │
         ▼
useSafeEligibility ──► useSelectedEligibility
         │
         ▼
useAutoRunSignals
         │
         ▼
useAutoRunScanner
         │
         ▼
useAutoRunStartOperations + useAutoRunStopOperations
         │
         ▼
useAutoRunOperations
         │
         ▼
useAutoRunLifecycle
         │
         ▼
useAutoRunController
         │
         ▼
AutoRunProvider.tsx
```

**Utils (test first — pure logic):**
- `context/AutoRunProvider/utils/utils.ts` — sorting, filtering, rotation
- `context/AutoRunProvider/utils/autoRunHelpers.ts` — eligibility normalization

**Hooks:**
- `context/AutoRunProvider/hooks/useAutoRunStore.ts` — auto-run persistence
- `context/AutoRunProvider/hooks/useConfiguredAgents.ts` — configured agents derivation
- `context/AutoRunProvider/hooks/useSafeEligibility.ts` — safe eligibility checks
- `context/AutoRunProvider/hooks/useSelectedEligibility.ts` — selected agent eligibility
- `context/AutoRunProvider/hooks/useAutoRunVerboseLogger.ts` — verbose logging
- `context/AutoRunProvider/hooks/useLogAutoRunEvent.ts` — event logging
- `context/AutoRunProvider/hooks/useAutoRunSignals.ts` — abort/pause signals (332 lines)
- `context/AutoRunProvider/hooks/useAutoRunScanner.ts` — queue traversal (451 lines, 28+ branches)
- `context/AutoRunProvider/hooks/useAutoRunStartOperations.ts` — start workflows
- `context/AutoRunProvider/hooks/useAutoRunStopOperations.ts` — stop workflows
- `context/AutoRunProvider/hooks/useAutoRunOperations.ts` — operations coordination
- `context/AutoRunProvider/hooks/useAutoRunLifecycle.ts` — lifecycle management (474 lines)
- `context/AutoRunProvider/hooks/useAutoRunController.ts` — top-level coordination

**Provider:**
- `context/AutoRunProvider/AutoRunProvider.tsx` — full provider (374 lines)

**Test files:**
- ✅ `context/AutoRunProvider/utils/utils.test.ts` — 29 tests: notifications, agent matching, sorting, normalizing, decommissioned/eligible/excluded derivation
- ✅ `context/AutoRunProvider/utils/autoRunHelpers.test.ts` — 28 tests: formatEligibilityReason, isOnlyLoadingReason, normalizeEligibility, refreshRewardsEligibility (throttle, fetch, onError)
- ✅ `context/AutoRunProvider/hooks/useAutoRunStore.test.ts` — 6 tests: defaults, reads, partial updates, no-op when store undefined
- ✅ `context/AutoRunProvider/hooks/useConfiguredAgents.test.ts` — 8 tests: undefined/empty services, mapping, staking fallback, skip cases, memoization
- ✅ `context/AutoRunProvider/hooks/useAutoRunVerboseLogger.test.ts` — 2 tests: calls logMessage, stable callback
- ✅ `context/AutoRunProvider/hooks/useLogAutoRunEvent.test.ts` — 2 tests: prefix prepended, undefined logEvent
- ✅ `context/AutoRunProvider/hooks/useSafeEligibility.test.ts` — 8 tests: canCreateSafeForChain (5 states), createSafeIfNeeded (3 paths)
- ✅ `context/AutoRunProvider/hooks/useSelectedEligibility.test.ts` — 6 tests: returns, config, loading, eligibility getter, rerender, chain passing
- ✅ `context/AutoRunProvider/hooks/useAutoRunSignals.test.ts` — 26 tests: ref syncing, reward snapshots, balances status, scheduleNextScan (4 cases), waitForAgentSelection, waitForRunningAgent
- ✅ `context/AutoRunProvider/hooks/useAutoRunStartOperations.test.ts` — 12 tests: ABORTED (4 cases), AGENT_BLOCKED (2 cases), STARTED (2 cases), INFRA_FAILED (2 cases), Loading notification, finally block
- ✅ `context/AutoRunProvider/hooks/useAutoRunStopOperations.test.ts` — 6 tests: first poll stop, local fallback, 3-attempt metrics, error handling, sleep/wake interrupt, verbose logging
- ✅ `context/AutoRunProvider/hooks/useAutoRunScanner.test.ts` — 26 tests: getPreferredStartFrom (4), scanAndStartNext (10), startSelectedAgentIfEligible (7)
- ✅ `context/AutoRunProvider/hooks/useAutoRunOperations.test.ts` — 6 tests: exposes functions, notifySkipOnce dedup (4 cases), reset on disable
- ✅ `context/AutoRunProvider/hooks/useAutoRunLifecycle.test.ts` — 16 tests: stopCurrentRunningAgent (3), backoff cleanup, rotation flow (5), startup flow (2)
- ✅ `context/AutoRunProvider/hooks/useAutoRunController.test.ts` — 6 tests: returns, delegation, health stats reset, health summary interval, interval cleanup
- ✅ `context/AutoRunProvider/AutoRunProvider.test.tsx` — 13 tests: context values, seeding (2), setEnabled (3), includeAgent (3), excludeAgent (2), eligibilityByAgent (2)

**Reference:** See [`frontend/context/AutoRunProvider/docs/auto-run.md`](../../context/AutoRunProvider/docs/auto-run.md) for documented bugs fixed, edge cases, and design decisions.

---

## Phase 9 — Static Data & Pure Types `[EASY]`

**Goal:** Cover constants, types, and ABIs. These are mostly pure data — tests validate structure and completeness.

**Constants (26 files):**
- `constants/achievement.ts`, `constants/address.ts`, `constants/agent.ts`, `constants/chains.ts`
- `constants/colors.ts`, `constants/contract.ts`, `constants/defaults.ts`, `constants/deployment.ts`
- `constants/env.ts`, `constants/envVariables.ts`, `constants/headers.ts`, `constants/intervals.ts`
- `constants/onramp.ts`, `constants/pages.ts`, `constants/providers.ts`, `constants/reactQueryKeys.ts`
- `constants/screen.ts`, `constants/serviceRegistryL2ServiceState.ts`, `constants/setupScreen.ts`
- `constants/stakingProgram.ts`, `constants/symbols.ts`, `constants/urls.ts`, `constants/wallet.ts`
- `constants/x402.ts`
- `constants/serviceTemplates/` — service template definitions
- `constants/theme/` — theme config

**Types (16 files):**
- All files in `types/` — pure TypeScript interfaces

**ABIs (13 files):**
- All files in `abis/` — pure ABI exports

**Config (static data files):**
- `config/chains.ts`, `config/tokens.ts`, `config/mechs.ts`
- `config/olasContracts.ts`, `config/activityCheckers.ts`
- `config/stakingPrograms/base.ts`, `gnosis.ts`, `mode.ts`, `optimism.ts`, `polygon.ts`

**Note:** These files contain no logic — tests verify exports exist, data shapes are correct, and no accidental breakage of config values.

---

## Phase 10 — Remaining Component UI & Pages `[MEDIUM]`

**Goal:** Cover remaining component rendering and page-level behavior not already covered by feature phases. Focus on business logic in render paths, not DOM structure.

**Components with meaningful render logic:**
- `components/SetupPage/` — setup wizard steps (excluding FundYourAgent hooks in Phase 5)
- `components/SettingsPage/` — settings forms
- `components/MainPage/` — main dashboard (excluding hooks in Phase 1)
- `components/UpdateAgentPage/` — agent update flow (excluding hooks/context in Phase 7)
- `components/SupportModal/` — support modal
- `components/Web3AuthIframe/` — web3auth integration

**Pure UI (low priority):**
- `components/ui/` — reusable UI library (28 files)
- `components/custom-icons/` — icon components
- `components/Layout/` — layout wrappers
- `components/ErrorBoundary/` — error display

**Pages:**
- `pages/_app.tsx` — app wrapper
- `pages/index.tsx` — home
- `pages/onramp.tsx` — on-ramp page
- `pages/web3auth.tsx`, `pages/web3auth-swap-owner.tsx` — web3auth pages

---

## Summary

| Phase | Feature Domain | Difficulty | Status |
|-------|---------------|------------|--------|
| 0 | Shared Utilities & Config | EASY | ✅ COMPLETE |
| 1 | App Infrastructure | EASY-MEDIUM | ✅ COMPLETE |
| 2 | Account & Wallet | MEDIUM | ✅ COMPLETE |
| 3 | Balance & Services | MEDIUM-HARD | ✅ COMPLETE |
| 4 | Staking & Rewards | HARD | ✅ COMPLETE |
| 5 | Funding & Refill | MEDIUM-HARD | ✅ COMPLETE |
| 6 | Bridging & On-ramping | MEDIUM-HARD | ✅ COMPLETE |
| 7 | Deployability & Lifecycle | HARD | ✅ COMPLETE |
| 8 | Auto-run System | VERY HARD | ✅ COMPLETE |
| 9 | Static Data & Pure Types | EASY | Not started |
| 10 | Remaining Component UI & Pages | MEDIUM | ✅ COMPLETE |

## Workflow per phase

1. Branch off `main` (after previous PR is merged)
2. **Read the feature doc(s)** for the phase (see table above) — understand runtime behavior, edge cases, and test-relevant notes before writing any tests
3. Write all tests for the phase, run after each file
4. Run `yarn test:coverage` to verify
5. Commit, create PR, review together
6. Merge, move to next phase

## Verification

```bash
cd frontend && yarn test:coverage
```

Final target: **all 577 files at 100% statement + branch coverage**.
