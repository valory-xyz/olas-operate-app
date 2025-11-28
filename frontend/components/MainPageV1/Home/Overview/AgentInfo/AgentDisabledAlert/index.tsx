import { AgentLowBalanceAlert } from '@/components/AgentLowBalanceAlert';
import { PAGES } from '@/constants';
import {
  useActiveStakingContractDetails,
  useAgentRunning,
  useIsInitiallyFunded,
  usePageState,
  useServices,
} from '@/hooks';

import { AgentRunningAlert } from './AgentRunningAlert';
import { EvictedAlert } from './EvictedAlert';
import { MasterEoaLowBalanceAlert } from './MasterEoaLowBalanceAlert';
import { NoSlotsAvailableAlert } from './NoSlotsAvailableAlert';
import { UnderConstructionAlert } from './UnderConstructionAlert';
import { UnfinishedSetupAlert } from './UnfinishedSetupAlert';

export const AgentDisabledAlert = () => {
  const { selectedAgentConfig } = useServices();
  const {
    isSelectedStakingContractDetailsLoading,
    isAgentEvicted,
    isEligibleForStaking,
    hasEnoughServiceSlots,
    isServiceStaked,
  } = useActiveStakingContractDetails();
  const { isInitialFunded } = useIsInitiallyFunded();
  const { goto } = usePageState();
  const { isAnotherAgentRunning } = useAgentRunning();

  if (selectedAgentConfig.isUnderConstruction) {
    return <UnderConstructionAlert />;
  }

  if (isAnotherAgentRunning) {
    return <AgentRunningAlert />;
  }

  // The "store" is `undefined` during updates, hence waiting till we get the correct value from the store.
  if (isInitialFunded === false) return <UnfinishedSetupAlert />;

  if (
    !isSelectedStakingContractDetailsLoading &&
    isServiceStaked === false &&
    hasEnoughServiceSlots === false
  ) {
    return <NoSlotsAvailableAlert />;
  }

  if (isAgentEvicted && !isEligibleForStaking) return <EvictedAlert />;

  // NOTE: Low-balance alerts, each component controls its own visibility.
  return (
    <>
      <AgentLowBalanceAlert onFund={() => goto(PAGES.AgentWallet)} />
      <MasterEoaLowBalanceAlert />
    </>
  );
};
