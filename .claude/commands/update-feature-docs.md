# Update Feature Documentation

You are updating feature documentation in `docs/dev/features/` to reflect code changes in the frontend.

## Step 1: Identify changed files

Run `git diff --name-only HEAD` (unstaged + staged changes) and `git diff --name-only --cached` (staged only). Combine both lists. If no changes are found, also try `git diff --name-only main...HEAD` to catch all changes on the current branch.

Filter to only `frontend/` files (the feature docs only cover frontend code).

## Step 2: Map changed files to feature docs

Use this mapping to determine which feature doc(s) need updating. A changed file may map to multiple docs.

**account.md**: `frontend/service/Account.ts`, `frontend/service/Recovery.ts`, `frontend/context/SetupProvider.tsx`, `frontend/hooks/useSetup.ts`, `frontend/hooks/useValidatePassword.ts`, `frontend/hooks/useMnemonicExists.ts`, `frontend/hooks/useRecoveryPhraseBackup.ts`, `frontend/hooks/useBackupSigner.ts`, `frontend/types/Recovery.ts`

**balance.md**: `frontend/service/Balance.ts`, `frontend/context/BalanceProvider/BalanceProvider.tsx`, `frontend/context/BalanceProvider/utils.ts`, `frontend/hooks/useBalanceContext.ts`, `frontend/hooks/useBalanceAndRefillRequirementsContext.ts`, `frontend/hooks/useMasterBalances.ts`, `frontend/hooks/useServiceBalances.ts`, `frontend/hooks/useAvailableAssets.ts`, `frontend/hooks/useAvailableAgentAssets.ts`, `frontend/types/Balance.ts`, `frontend/types/Funding.ts`, `frontend/constants/serviceRegistryL2ServiceState.ts`, `frontend/context/BalancesAndRefillRequirementsProvider/BalancesAndRefillRequirementsProvider.tsx`, `frontend/hooks/useStakingRewardsOf.ts`

**bridging.md**: `frontend/service/Bridge.ts`, `frontend/types/Bridge.ts`, `frontend/hooks/useBridgeRefillRequirements.ts`, `frontend/hooks/useBridgeRefillRequirementsOnDemand.ts`, `frontend/hooks/useBridgingSteps.ts`, `frontend/components/Bridge/Bridge.tsx`, `frontend/components/Bridge/BridgeOnEvm/DepositForBridging.tsx`, `frontend/components/Bridge/BridgeTransferFlow.tsx`, `frontend/components/Bridge/BridgeInProgress/BridgeInProgress.tsx`, `frontend/components/Bridge/BridgeInProgress/BridgingSteps.tsx`, `frontend/components/Bridge/BridgeInProgress/useRetryBridge.ts`, `frontend/components/Bridge/BridgeInProgress/useMasterSafeCreateAndTransferSteps.ts`, `frontend/components/Bridge/types.ts`

**deployability-and-lifecycle.md**: `frontend/hooks/useDeployability.ts`, `frontend/hooks/useStartService.ts`, `frontend/hooks/useServiceDeployment.ts`, `frontend/utils/service.ts`, `frontend/utils/safe.ts`, `frontend/context/SharedProvider/SharedProvider.tsx`, `frontend/hooks/useSharedContext.ts`, `frontend/service/Settings.ts`, `frontend/service/Achievement.ts`, `frontend/types/Achievement.ts`, `frontend/constants/achievement.ts`, `frontend/components/AchievementModal/hooks/useAchievements.ts`, `frontend/components/AchievementModal/hooks/useCurrentAchievement.ts`, `frontend/components/AchievementModal/hooks/useTriggerAchievementBackgroundTasks.ts`, `frontend/components/AchievementModal/index.tsx`, `frontend/components/AchievementModal/utils.ts`, `frontend/components/UpdateAgentPage/index.tsx`, `frontend/components/UpdateAgentPage/hooks/useConfirmModal.ts`, `frontend/components/UpdateAgentPage/context/UpdateAgentProvider.tsx`

**dynamic-polling.md**: `frontend/hooks/useDynamicRefetchInterval.ts`, `frontend/constants/intervals.ts`

**electron-api.md**: `electron/preload.js`, `frontend/context/ElectronApiProvider.tsx`, `frontend/hooks/useElectronApi.ts`, `electron/store.js`, `frontend/context/StoreProvider.tsx`, `frontend/hooks/useStore.ts`

**feature-flags.md**: `frontend/hooks/useFeatureFlag.ts`

**funding-and-refill.md**: `frontend/service/Fund.ts`, `frontend/context/BalancesAndRefillRequirementsProvider/BalancesAndRefillRequirementsProvider.tsx`, `frontend/types/Funding.ts`, `frontend/types/Bridge.ts`, `frontend/hooks/useGetRefillRequirements.ts`, `frontend/hooks/useAgentFundingRequests.tsx`, `frontend/hooks/useInitialFundingRequirements.ts`, `frontend/hooks/useGetBridgeRequirementsParams.ts`, `frontend/hooks/useGetOnRampRequirementsParams.ts`, `frontend/hooks/useTotalNativeTokenRequired.ts`, `frontend/hooks/useTotalFiatFromNativeToken.ts`

**on-ramping.md**: `frontend/context/OnRampProvider.tsx`, `frontend/hooks/useOnRampContext.ts`, `frontend/hooks/useGetOnRampRequirementsParams.ts`, `frontend/components/OnRamp/OnRamp.tsx`, `frontend/components/OnRamp/OnRampPaymentSteps/OnRampPaymentSteps.tsx`, `frontend/components/OnRamp/OnRampPaymentSteps/useBuyCryptoStep.tsx`, `frontend/components/OnRamp/OnRampPaymentSteps/useSwapFundsStep.tsx`, `frontend/components/OnRamp/OnRampPaymentSteps/useCreateAndTransferFundsToMasterSafeSteps.tsx`, `frontend/components/OnRamp/PayingReceivingTable/PayingReceivingTable.tsx`, `frontend/components/OnRamp/PayingReceivingTable/useBridgeRequirementsQuery.ts`, `frontend/components/OnRamp/hooks/useBridgeRequirementsUtils.ts`, `frontend/hooks/useTotalNativeTokenRequired.ts`, `frontend/hooks/useTotalFiatFromNativeToken.ts`, `frontend/components/OnRamp/types.ts`, `frontend/components/OnRampIframe/OnRampIframe.tsx`, `frontend/pages/onramp.tsx`, `frontend/constants/onramp.ts`, `frontend/constants/urls.ts`

**services.md**: `frontend/service/Services.ts`, `frontend/context/ServicesProvider.tsx`, `frontend/hooks/useServices.ts`, `frontend/hooks/useService.ts`, `frontend/hooks/useAgentRunning.ts`, `frontend/hooks/useAgentActivity.ts`, `frontend/hooks/useIsInitiallyFunded.ts`, `frontend/hooks/useIsAgentGeoRestricted.ts`

**staking-and-rewards.md**: `frontend/config/stakingPrograms/index.ts`, `frontend/config/stakingPrograms/*.ts`, `frontend/constants/stakingProgram.ts`, `frontend/types/Autonolas.ts`, `frontend/context/StakingProgramProvider.tsx`, `frontend/context/StakingContractDetailsProvider.tsx`, `frontend/context/RewardProvider.tsx`, `frontend/hooks/useStakingProgram.ts`, `frontend/hooks/useStakingContracts.ts`, `frontend/hooks/useStakingContractDetails.ts`, `frontend/hooks/useStakingContractCountdown.ts`, `frontend/hooks/useStakingDetails.ts`, `frontend/hooks/useActiveStakingProgramId.ts`, `frontend/hooks/useStakingRewardsOf.ts`, `frontend/hooks/useAgentStakingRewardsDetails.ts`, `frontend/hooks/useRewardsHistory.ts`, `frontend/utils/stakingProgram.ts`, `frontend/utils/stakingRewards.ts`

**support-and-logs.md**: `frontend/service/Support.ts`, `frontend/hooks/useLogs.ts`, `frontend/components/SupportModal/useFallbackLogs.ts`, `frontend/components/SupportModal/useUploadSupportFiles.ts`, `frontend/components/SupportModal/utils.ts`, `frontend/components/SupportModal/SupportModal.tsx`, `frontend/components/ExportLogsButton.tsx`, `frontend/context/SupportModalProvider.tsx`

**wallet.md**: `frontend/service/Wallet.ts`, `frontend/context/MasterWalletProvider.tsx`, `frontend/context/PearlWalletProvider.tsx`, `frontend/hooks/useWallet.ts`, `frontend/hooks/useBackupSigner.ts`, `frontend/hooks/useMultisig.ts`, `frontend/hooks/useMasterSafeCreationAndTransfer.ts`, `frontend/utils/wallet.ts`, `frontend/constants/wallet.ts`, `frontend/types/Wallet.ts`

**auto-run** (doc at `frontend/context/AutoRunProvider/docs/auto-run.md`, NOT in `docs/dev/features/`): `frontend/context/AutoRunProvider/AutoRunProvider.tsx`, `frontend/context/AutoRunProvider/index.ts`, `frontend/context/AutoRunProvider/types.ts`, `frontend/context/AutoRunProvider/constants.ts`, `frontend/context/AutoRunProvider/utils/utils.ts`, `frontend/context/AutoRunProvider/utils/autoRunHelpers.ts`, `frontend/context/AutoRunProvider/hooks/useAutoRunController.ts`, `frontend/context/AutoRunProvider/hooks/useAutoRunLifecycle.ts`, `frontend/context/AutoRunProvider/hooks/useAutoRunOperations.ts`, `frontend/context/AutoRunProvider/hooks/useAutoRunScanner.ts`, `frontend/context/AutoRunProvider/hooks/useAutoRunSignals.ts`, `frontend/context/AutoRunProvider/hooks/useAutoRunStartOperations.ts`, `frontend/context/AutoRunProvider/hooks/useAutoRunStopOperations.ts`, `frontend/context/AutoRunProvider/hooks/useAutoRunStore.ts`, `frontend/context/AutoRunProvider/hooks/useAutoRunVerboseLogger.ts`, `frontend/context/AutoRunProvider/hooks/useConfiguredAgents.ts`, `frontend/context/AutoRunProvider/hooks/useLogAutoRunEvent.ts`, `frontend/context/AutoRunProvider/hooks/useSafeEligibility.ts`, `frontend/context/AutoRunProvider/hooks/useSelectedEligibility.ts`

If a changed file doesn't map to any doc, report it as unmapped — it may belong to a feature doc that doesn't exist yet.

## Step 3: For each affected doc, diff and update

For each feature doc that needs updating:

1. **Read the current doc** completely
2. **Read the changed source file(s)** completely — understand what changed
3. **Read the git diff** for each changed file to understand the specific modifications
4. **Update only the affected sections** of the doc. The doc has 6 sections:
   - **Overview** — update if the architecture or layer structure changed
   - **Source of truth** — update if files were added, removed, or renamed
   - **Contract / schema** — update if API shapes, types, context shapes, or constants changed
   - **Runtime behavior** — update if control flow, polling, state transitions, or business logic changed
   - **Failure / guard behavior** — update if error handling, guards, or edge cases changed
   - **Test-relevant notes** — update if testable behavior changed (new branches, new edge cases, changed mocking needs)

## Rules

- **Do not rewrite sections that haven't changed.** Only edit the specific lines affected by the code change.
- **Preserve the existing doc style** — same heading levels, same table formats, same code block language tags.
- **Use real examples** for API responses, not TypeScript types or placeholder values.
- **Keep docs scoped** — each doc covers only its feature domain. Don't add cross-feature content.
- **If a file maps to multiple docs**, update each doc independently for the parts relevant to that doc's scope.
- **Do not commit** — just make the edits. The user will review and commit separately.
- After updating, print a summary of what changed in each doc and why.

## Step 4: Report

After all updates, print:
- Which docs were updated and what sections changed
- Which changed files were unmapped (if any)
- Whether any new source files should be added to a doc's "Source of truth" section
