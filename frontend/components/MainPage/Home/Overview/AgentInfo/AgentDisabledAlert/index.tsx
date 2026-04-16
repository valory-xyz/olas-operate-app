import { ReactNode, useMemo } from 'react';

import { AgentLowBalanceAlert } from '@/components/AgentLowBalanceAlert';
import { STEPS } from '@/components/AgentWallet/types';
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
import { AgentRunningAlert } from './AgentRunningAlert';
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
  } = useCompleteAgentSetup();

  const { isAgentGeoRestricted } = useIsAgentGeoRestricted({
    agentType: selectedAgentType,
    agentConfig: selectedAgentConfig,
  });

  const alertResult = useMemo<{
    key: string;
    content: ReactNode;
  }>(() => {
    if (selectedAgentConfig?.isGeoLocationRestricted && isAgentGeoRestricted) {
      return { key: 'geo-blocked', content: <AgentGeoBlockedAlert /> };
    }

    if (selectedAgentConfig.isUnderConstruction) {
      return { key: 'under-construction', content: <UnderConstructionAlert /> };
    }

    // The "store" is `undefined` during updates, hence waiting till we get the correct value from the store.
    if (isInitialFunded === false) {
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

    if (isAgentEvicted && !isEligibleForStaking) {
      return { key: 'evicted', content: <EvictedAlert /> };
    }

    // NOTE: Low-balance alerts, each component controls its own visibility.
    return {
      key: 'low-balance',
      content: (
        <>
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
