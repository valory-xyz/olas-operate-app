# Test Coverage Plan: 0% → 100%

## Context

Pearl frontend has **577 files** tracked by Jest coverage, nearly all at 0% (only `numberFormatters.ts` partially tested). This plan is organized by feature domains, ordered by dependency layers — test foundations first, then features that depend on them. Each phase = one PR.

## Coverage scope

`jest.config.ts` collects from **all** `.ts/.tsx` files, excluding only:
- `*.d.ts`, `*.test.*`, `tests/`, `.next/`, `node_modules/`, `jest.config.ts`, `jest.setup.ts`

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

## Phase 0 — Shared Utilities & Config (~22 files) `[EASY]` ✅ COMPLETE

**Goal:** Cover all pure generic functions. Establishes test patterns.

**Result:** 22 test files, 230 tests, all passing, 0 lint errors.

**Shared test infrastructure in `tests/mocks/`:**
- `mocks/factories.ts` — factories (`makeMasterEoa`, `makeMasterSafe`, `makeMultisigOwners`), address constants (`DEFAULT_EOA_ADDRESS`, `DEFAULT_SAFE_ADDRESS`, `BACKUP_SIGNER_ADDRESS`, `BACKUP_SIGNER_ADDRESS_2`), and sentinels (`INVALID_CHAIN_ID`, `UNKNOWN_TOKEN_ADDRESS`, `ALL_EVM_CHAIN_IDS`). All phases should use these instead of inline `as any` casts or short placeholder addresses.
- `mocks/ethersMulticall.ts` — shared `ethers-multicall` module mock (used via `jest.mock` + `require`).
- `mocks/servicesService.ts` — shared `ServicesService` module mock (used via `jest.mock` + `require`).

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

## Phase 1 — App Infrastructure (~28 files) `[EASY-MEDIUM]` ✅ COMPLETE

**Goal:** Cover infrastructure hooks/providers and main page hooks that everything else depends on.

**Result:** 28 test files, 106 tests, all passing, 0 lint errors.

**Context accessors (12 files):**
- ✅ `hooks/useElectronApi.ts` — 100%
- ✅ `hooks/useStore.ts` — 100%
- ✅ `hooks/useOnlineStatus.ts` — 100%
- ✅ `hooks/usePageState.ts` — 100%
- ✅ `hooks/useSettings.ts` — 100%
- ✅ `hooks/useServices.ts` — 100%
- ✅ `hooks/useWallet.ts` — 100%
- ✅ `hooks/useRewardContext.ts` — 100%
- ✅ `hooks/useSharedContext.ts` — 100% (error guard tested)
- ✅ `hooks/useBalanceContext.ts` — 100%
- ✅ `hooks/useBalanceAndRefillRequirementsContext.ts` — 100%
- ✅ `hooks/useOnRampContext.ts` — 100% (error guard tested)

**Providers (7 files):**
- ✅ `context/ElectronApiProvider.tsx` — 100% stmts (error path + happy path)
- ✅ `context/StoreProvider.tsx` — 95% (IPC listener registration)
- ✅ `context/OnlineStatusProvider.tsx` — 92% (online/offline events, `useOnlineStatus` guard is dead code)
- ✅ `context/PageStateProvider.tsx` — 97% (useTimeout mock, page state transitions)
- ✅ `context/MessageProvider.tsx` — 61% (error guard + provider rendering)
- ✅ `context/SettingsProvider.tsx` — 100%
- ✅ `context/SupportModalProvider.tsx` — 100% (toggle behavior)

**Hooks with logic (5 files):**
- ✅ `hooks/usePause.ts` — 100%
- ✅ `hooks/useDynamicRefetchInterval.ts` — 99% (all window states: focused/visible/hidden, function/number/false/undefined)
- ✅ `hooks/useFeatureFlag.ts` — 99% (all agent types, single + array flags, error guard)
- ✅ `hooks/useGlobalErrorHandlers.ts` — 100% (error events, rejection events, Error wrapping)
- ✅ `hooks/useLogs.ts` — all branches covered (services, addresses, balances, backup EOA filtering)

**MainPageV1 hooks (4 files):**
- ✅ `components/MainPageV1/hooks/useScrollPage.ts` — ref creation
- ✅ `components/MainPageV1/hooks/useNotifyOnAgentRewards.ts` — all 5 branches (eligibility transitions, deployment status guard)
- ✅ `components/MainPageV1/hooks/useSetupTrayIcon.ts` — all 5 tray icon states + priority
- ✅ `components/MainPageV1/hooks/useNotifyOnNewEpoch.ts` — all 12 guard branches

**Patterns established:**
- `PromiseRejectionEvent` polyfill for jsdom (in `useGlobalErrorHandlers.test.ts`)
- `document.hasFocus()` spy for window visibility state testing
- `usehooks-ts` `useTimeout` mock for timer-based providers

---

## Phase 2 — Account & Wallet Management (~18 files) `[MEDIUM]`

**Goal:** Cover account lifecycle, wallet operations, and recovery — including related components.

**Account:**
- `service/Account.ts` — account creation, login, password
- `hooks/useValidatePassword.ts` — password validation
- `hooks/useMnemonicExists.ts` — mnemonic check
- `hooks/useRecoveryPhraseBackup.ts` — backup status
- `hooks/useSetup.ts` — setup flow sync
- `hooks/useBackupSigner.ts` — backup signer info
- `context/SetupProvider.tsx` — setup context
- `service/Recovery.ts` — recovery operations

**Wallet:**
- `utils/wallet.ts` — wallet helpers
- `service/Wallet.ts` — EOA/Safe creation, mnemonic
- `context/MasterWalletProvider.tsx` — master wallet state
- `context/PearlWalletProvider.tsx` — wallet chain context, deposit/withdraw state (353 lines)
- `hooks/useMultisig.ts` — multisig owners via multicall
- `hooks/useMasterSafeCreationAndTransfer.ts` — safe creation + transfers

**Account Recovery (components):**
- `components/AccountRecovery/hooks/useWeb3AuthSwapOwner.ts` — web3auth swap owner hook
- `components/AccountRecovery/components/ApproveWithBackupWallet/` — approval logic

**Estimated tests:** ~60-80

---

## Phase 3 — Balance & Services (~16 files) `[MEDIUM-HARD]`

**Goal:** Cover the two core data providers that almost every feature depends on.

**Balance:**
- `hooks/useBalanceContext.ts` — balance context accessor
- `hooks/useBalanceAndRefillRequirementsContext.ts` — refill requirements context accessor
- `service/Balance.ts` — balance API client
- `context/BalanceProvider/utils.ts` — balance calculation utilities
- `context/BalanceProvider/BalanceProvider.tsx` — balance state + polling
- `hooks/useMasterBalances.ts` — master wallet balances (18 branches)
- `hooks/useServiceBalances.ts` — service wallet balances
- `hooks/useAvailableAssets.ts` — available master assets
- `hooks/useAvailableAgentAssets.ts` — available agent assets

**Services:**
- `service/Services.ts` — service CRUD + deployment API
- `context/ServicesProvider.tsx` — services state + polling (461 lines)
- `hooks/useService.ts` — single service details
- `hooks/useAgentRunning.ts` — running agent detection
- `hooks/useAgentActivity.ts` — deployment status
- `hooks/useIsInitiallyFunded.ts` — initial funding flag
- `hooks/useIsAgentGeoRestricted.ts` — geo restrictions

**Estimated tests:** ~80-100

---

## Phase 4 — Staking & Rewards (~27 files) `[HARD]`

**Goal:** Cover the staking system — programs, contracts, eligibility, rewards — including staking-related components.

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
- `components/ConfirmSwitch/hooks/useShouldAllowStakingContractSwitch.ts` — switch eligibility hook
- `components/SelectStakingPage/hooks/useCanMigrate.ts` — migration eligibility hook
- `components/SelectStakingPage/hooks/useStakingDetails.ts` — staking details hook

**Estimated tests:** ~100-120

---

## Phase 5 — Funding & Refill Requirements (~10 files) `[MEDIUM-HARD]`

**Goal:** Cover the funding logic — what tokens are needed, how much, and where — including setup funding components.

- `hooks/useGetRefillRequirements.ts` — requirement aggregation + formatting
- `hooks/useAgentFundingRequests.tsx` — agent funding needs consolidation
- `hooks/useInitialFundingRequirements.ts` — first-time funding
- `hooks/useGetBridgeRequirementsParams.ts` — bridge requirement params
- `hooks/useGetOnRampRequirementsParams.ts` — on-ramp requirement params
- `context/BalancesAndRefillRequirementsProvider/BalancesAndRefillRequirementsProvider.tsx` — consolidated provider
- `service/Fund.ts` — fund API client
- `hooks/useTotalFiatFromNativeToken.ts` — fiat price conversion

**Funding components:**
- `components/SetupPage/FundYourAgent/hooks/` — funding setup hooks

**Estimated tests:** ~55-75

---

## Phase 6 — Bridging & On-ramping (~25 files) `[MEDIUM-HARD]`

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
- `hooks/useTotalNativeTokenRequired.ts` — total native token calc with freeze logic

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

**Estimated tests:** ~70-90

---

## Phase 7 — Deployability & Service Lifecycle (~12 files) `[HARD]`

**Goal:** Cover the deployment decision tree, service start/stop orchestration, agent updates, and achievements — including related components.

- `hooks/useDeployability.ts` — 14-branch eligibility decision tree
- `hooks/useStartService.ts` — service start orchestration
- `hooks/useServiceDeployment.ts` — full deployment workflow (203 lines)
- `service/Settings.ts` — settings API
- `service/Achievement.ts` — achievement tracking
- `service/Support.ts` — support API
- `context/SharedProvider/SharedProvider.tsx` — AgentsFun field updates

**Achievement components:**
- `components/AchievementModal/hooks/` — achievement display logic

**Agent update components:**
- `components/UpdateAgentPage/hooks/` — update logic
- `components/UpdateAgentPage/context/` — update context provider

**Estimated tests:** ~70-90

---

## Phase 8 — Auto-run System (~18 files) `[VERY HARD]`

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
- `context/AutoRunProvider/constants.ts` — constants
- `context/AutoRunProvider/types.ts` — type validation

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

**Estimated tests:** ~100-120

---

## Phase 9 — Static Data & Pure Types (~55 files) `[EASY]`

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

**Estimated tests:** ~30-50

---

## Phase 10 — Remaining Component UI & Pages (~50 files) `[MEDIUM]`

**Goal:** Cover remaining component rendering and page-level behavior not already covered by feature phases. Focus on business logic in render paths, not DOM structure.

**Components with meaningful render logic:**
- `components/AgentStaking/` — staking display logic
- `components/AgentWallet/` — wallet display, fund agent, withdraw
- `components/PearlWallet/` — wallet withdraw flow
- `components/SetupPage/` — setup wizard steps (excluding FundYourAgent hooks in Phase 5)
- `components/SettingsPage/` — settings forms
- `components/MainPageV1/` — main dashboard (excluding hooks in Phase 1)
- `components/SelectStakingPage/` — staking program selection (excluding hooks in Phase 4)
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

**Estimated tests:** ~60-80

---

## Summary

| Phase | Feature Domain | Files | Difficulty | Est. Tests | PR |
|-------|---------------|-------|------------|------------|-----|
| 0 | Shared Utilities & Config | ~20 | EASY | 80-120 | PR #1 |
| 1 | App Infrastructure | ~22 | EASY-MEDIUM | 40-55 | PR #2 |
| 2 | Account & Wallet | ~18 | MEDIUM | 60-80 | PR #3 |
| 3 | Balance & Services | ~16 | MEDIUM-HARD | 80-100 | PR #4 |
| 4 | Staking & Rewards | ~27 | HARD | 100-120 | PR #5 |
| 5 | Funding & Refill | ~10 | MEDIUM-HARD | 55-75 | PR #6 |
| 6 | Bridging & On-ramping | ~25 | MEDIUM-HARD | 70-90 | PR #7 |
| 7 | Deployability & Lifecycle | ~12 | HARD | 70-90 | PR #8 |
| 8 | Auto-run System | ~18 | VERY HARD | 100-120 | PR #9 |
| 9 | Static Data & Pure Types | ~55 | EASY | 30-50 | PR #10 |
| 10 | Remaining Component UI & Pages | ~50 | MEDIUM | 60-80 | PR #11 |
| **Total** | | **~273** | | **~745-980** |  |

## Workflow per phase

1. Branch off `main` (after previous PR is merged)
2. Write all tests for the phase, run after each file
3. Run `yarn test:coverage` to verify
4. Commit, create PR, review together
5. Merge, move to next phase

## Verification

```bash
cd frontend && yarn test:coverage
```

Final target: **all 577 files at 100% statement + branch coverage**.
