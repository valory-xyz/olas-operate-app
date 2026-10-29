import { isNil } from 'lodash';
import { ReactNode, useMemo } from 'react';

import { AgentLowBalanceAlert } from '@/components/AgentLowBalanceAlert';
import { STEPS } from '@/components/AgentWallet/types';
import { NoStakingRewardsAlert } from '@/components/NoStakingRewardsAlert';
import {
  AgentSetupCompleteModal,
  ContentTransition,
  FinishingSetupModal,
  MasterSafeCreationFailedModal,
  useContentTransitionValue,
} from '@/components/ui';
import { PAGES } from '@/constants';
import { MiddlewareDeploymentStatusMap } from '@/constants/deployment';
import {
  isPrestartCheckBlocking,
  useActiveStakingContractDetails,
  useAgentFundingRequests,
  useAgentRunning,
  useCompleteAgentSetup,
  useIsAgentGeoRestricted,
  useIsInitiallyFunded,
  useMasterWalletContext,
  usePageState,
  usePrestartCheck,
  useServices,
  useStakingProgram,
} from '@/hooks';

import { AgentGeoBlockedAlert } from './AgentGeoBlockedAlert';
import { AgentIssuesAlert } from './AgentIssuesAlert';
import { AgentPhasedOutAlert } from './AgentPhasedOutAlert';
import { AgentRunningAlert } from './AgentRunningAlert';
import { ContractDeprecatedAlert } from './ContractDeprecatedAlert';
import { EvictedAlert } from './EvictedAlert';
import { MasterEoaLowBalanceAlert } from './MasterEoaLowBalanceAlert';
import { NoSlotsAvailableAlert } from './NoSlotsAvailableAlert';
import { UnderConstructionAlert } from './UnderConstructionAlert';
import { UnfinishedSetupAlert } from './UnfinishedSetupAlert';

export const AgentDisabledAlert = () => {
  const { goto } = usePageState();
  const {
    selectedAgentConfig,
    selectedAgentType,
    selectedService,
    deploymentDetails,
  } = useServices();
  const { agentTokenRequirements } = useAgentFundingRequests();
  const {
    isSelectedStakingContractDetailsLoading,
    isAgentEvicted,
    isEligibleForStaking,
    hasEnoughServiceSlots,
    isServiceStaked,
    selectedStakingContractDetails,
  } = useActiveStakingContractDetails();
  const { isInitialFunded } = useIsInitiallyFunded();
  const { getMasterSafeOf, masterWallets } = useMasterWalletContext();
  const { isAnotherAgentRunning } = useAgentRunning();
  const { selectedStakingProgramMeta } = useStakingProgram();

  // Wallet data, not `isFetched`: a failed fetch must not read as "no Safe".
  const isHomeChainSafeMissing =
    !isNil(masterWallets) &&
    !getMasterSafeOf?.(selectedAgentConfig.evmHomeChainId);

  const {
    setupState,
    handleCompleteSetup,
    modalToShow,
    dismissModal,
    handleTryAgain,
    handleContactSupport,
  } = useCompleteAgentSetup(
    isInitialFunded === false || isHomeChainSafeMissing,
  );

  const { isAgentGeoRestricted } = useIsAgentGeoRestricted({
    agentType: selectedAgentType,
    agentConfig: selectedAgentConfig,
  });

  const isServiceRunning =
    selectedService?.deploymentStatus ===
    MiddlewareDeploymentStatusMap.DEPLOYED;
  // A stopped agent's last healthcheck stays in the deployment payload, so
  // its issues only count while it runs.
  const runningAgentIssues = isServiceRunning
    ? deploymentDetails?.healthcheck?.agent_health?.issues
    : undefined;
  const { result: prestartCheck } = usePrestartCheck(
    selectedService?.service_config_id,
  );

  const alertResult = useMemo<{
    key: string;
    content: ReactNode;
  }>(() => {
    // Terminal retirement pre-empts every other disabled-state alert.
    if (selectedAgentConfig.isPhasedOut) {
      return {
        key: 'phased-out',
        content: (
          <AgentPhasedOutAlert agentName={selectedAgentConfig.displayName} />
        ),
      };
    }

    if (selectedAgentConfig?.isGeoLocationRestricted && isAgentGeoRestricted) {
      return { key: 'geo-blocked', content: <AgentGeoBlockedAlert /> };
    }

    if (runningAgentIssues?.length) {
      return {
        key: 'agent-issues',
        content: <AgentIssuesAlert issues={runningAgentIssues} />,
      };
    }

    if (!isServiceRunning && isPrestartCheckBlocking(prestartCheck)) {
      return {
        key: 'prestart-check',
        content: (
          <AgentIssuesAlert
            issues={
              prestartCheck?.status === 'failed'
                ? prestartCheck.issues
                : [
                    {
                      title: "Couldn't check the agent",
                      description: `Pearl couldn't check whether the ${selectedAgentConfig.displayName} agent can run on this network. Check your internet connection and try starting the agent again.`,
                    },
                  ]
            }
          />
        ),
      };
    }

    if (selectedAgentConfig.isUnderConstruction) {
      return { key: 'under-construction', content: <UnderConstructionAlert /> };
    }

    if (!isInitialFunded || isHomeChainSafeMissing) {
      return {
        key: 'unfinished-setup',
        content: (
          <UnfinishedSetupAlert
            setupState={setupState}
            handleCompleteSetup={handleCompleteSetup}
          />
        ),
      };
    }

    if (isAnotherAgentRunning) {
      return { key: 'another-running', content: <AgentRunningAlert /> };
    }

    if (selectedStakingProgramMeta && selectedStakingProgramMeta.deprecated) {
      return {
        key: 'contract-deprecated',
        content: (
          <ContractDeprecatedAlert
            stakingProgramName={selectedStakingProgramMeta.name}
          />
        ),
      };
    }

    if (
      !isSelectedStakingContractDetailsLoading &&
      isServiceStaked === false &&
      hasEnoughServiceSlots === false
    ) {
      return { key: 'no-slots', content: <NoSlotsAvailableAlert /> };
    }

    // Guarded on loading like the no-slots branch above: while staking details
    // load, `hasEnoughRewardsAndSlots` can be nil, which forces
    // `isEligibleForStaking` false and would flash the un-recoverable eviction
    // copy (with a date) at someone whose agent can actually re-stake now.
    if (
      !isSelectedStakingContractDetailsLoading &&
      isAgentEvicted &&
      !isEligibleForStaking
    ) {
      return { key: 'evicted', content: <EvictedAlert /> };
    }

    // Non-blocking: the reward pool of the selected contract is empty, so the
    // agent runs but earns nothing until it's refilled (OPE-1846). Rendered
    // alongside the low-balance alerts (which self-hide) so neither is masked.
    const hasNoStakingRewards =
      !isSelectedStakingContractDetailsLoading &&
      selectedStakingContractDetails?.availableRewards === 0;

    // NOTE: Low-balance alerts, each component controls its own visibility.
    return {
      key: 'low-balance',
      content: (
        <>
          {hasNoStakingRewards && (
            <NoStakingRewardsAlert
              className="mt-16"
              onSwitch={() => goto(PAGES.SelectStaking)}
            />
          )}
          <AgentLowBalanceAlert
            onFund={() =>
              goto(PAGES.AgentWallet, {
                initialStep: STEPS.FUND_AGENT,
                initialFundValues: agentTokenRequirements ?? {},
              })
            }
          />
          <MasterEoaLowBalanceAlert />
        </>
      ),
    };
  }, [
    agentTokenRequirements,
    setupState,
    handleCompleteSetup,
    goto,
    hasEnoughServiceSlots,
    isAgentEvicted,
    isAgentGeoRestricted,
    isAnotherAgentRunning,
    isEligibleForStaking,
    isHomeChainSafeMissing,
    isInitialFunded,
    isSelectedStakingContractDetailsLoading,
    isServiceRunning,
    isServiceStaked,
    prestartCheck,
    runningAgentIssues,
    selectedAgentConfig,
    selectedStakingContractDetails,
    selectedStakingProgramMeta,
  ]);

  // Delay the entire alert result so the old content stays frozen
  // during the page transition (old React element references are preserved,
  // so React skips re-rendering children during the delay).
  const { key, content } = useContentTransitionValue(alertResult);

  return (
    <>
      <ContentTransition
        animationKey={key}
        initialY={0}
        exitY={0}
        initialAnimation={false}
      >
        {content}
      </ContentTransition>

      {modalToShow === 'creatingSafe' && <FinishingSetupModal />}
      {modalToShow === 'setupComplete' && (
        <AgentSetupCompleteModal onDismiss={dismissModal} />
      )}
      {modalToShow === 'safeCreationFailed' && (
        <MasterSafeCreationFailedModal
          onTryAgain={handleTryAgain}
          onContactSupport={handleContactSupport}
        />
      )}
    </>
  );
};
