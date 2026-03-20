import { AnimatePresence, motion } from 'framer-motion';
import { ReactNode, useMemo } from 'react';

import { AgentLowBalanceAlert } from '@/components/AgentLowBalanceAlert';
import { usePageTransitionValue } from '@/components/ui';
import { PAGES } from '@/constants';
import {
  useActiveStakingContractDetails,
  useAgentRunning,
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

    if (isAnotherAgentRunning) {
      return { key: 'another-running', content: <AgentRunningAlert /> };
    }

    // The "store" is `undefined` during updates, hence waiting till we get the correct value from the store.
    if (isInitialFunded === false) {
      return { key: 'unfinished-setup', content: <UnfinishedSetupAlert /> };
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
          <AgentLowBalanceAlert onFund={() => goto(PAGES.AgentWallet)} />
          <MasterEoaLowBalanceAlert />
        </>
      ),
    };
  }, [
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
  const { key, content } = usePageTransitionValue(alertResult);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
};
