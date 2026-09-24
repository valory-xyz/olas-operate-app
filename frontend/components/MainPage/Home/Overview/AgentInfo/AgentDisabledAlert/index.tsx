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
import {
  useActiveStakingContractDetails,
  useAgentFundingRequests,
  useAgentRunning,
  useCompleteAgentSetup,
  useIsAgentGeoRestricted,
  useIsInitiallyFunded,
  usePageState,
  useServices,
  useStakingProgram,
} from '@/hooks';

import { AgentGeoBlockedAlert } from './AgentGeoBlockedAlert';
import { AgentPhasedOutAlert } from './AgentPhasedOutAlert';
import { AgentRunningAlert } from './AgentRunningAlert';
import { AgentStalledAlert } from './AgentStalledAlert';
import { ContractDeprecatedAlert } from './ContractDeprecatedAlert';
import { EvictedAlert } from './EvictedAlert';
import { MasterEoaLowBalanceAlert } from './MasterEoaLowBalanceAlert';
import { NoSlotsAvailableAlert } from './NoSlotsAvailableAlert';
import { UnderConstructionAlert } from './UnderConstructionAlert';
import { UnfinishedSetupAlert } from './UnfinishedSetupAlert';

export const AgentDisabledAlert = () => {
  const { goto } = usePageState();
  const { selectedAgentConfig, selectedAgentType } = useServices();
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
  const { isAnotherAgentRunning } = useAgentRunning();
  const { selectedStakingProgramMeta } = useStakingProgram();
  const {
    setupState,
    handleCompleteSetup,
    modalToShow,
    dismissModal,
    handleTryAgain,
    handleContactSupport,
  } = useCompleteAgentSetup(isInitialFunded === false);

  const { isAgentGeoRestricted } = useIsAgentGeoRestricted({
    agentType: selectedAgentType,
    agentConfig: selectedAgentConfig,
  });

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

    if (selectedAgentConfig.isUnderConstruction) {
      return { key: 'under-construction', content: <UnderConstructionAlert /> };
    }

    // The "store" is `undefined` during updates, hence waiting till we get the correct value from the store.
    if (!isInitialFunded) {
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
    // `AgentStalledAlert` joins them rather than taking an exclusive arm above:
    // a stall is transient, so an exclusive arm would either mask a blocking
    // condition or be masked by one, and an agent that is both stalled and low
    // on gas should say both (OPE-1941).
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
          <AgentStalledAlert />
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
    isInitialFunded,
    isSelectedStakingContractDetailsLoading,
    isServiceStaked,
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
