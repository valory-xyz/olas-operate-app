import {
  useActiveStakingContractDetails,
  useNeedsFunds,
  useServices,
  useStakingProgram,
} from '@/hooks';

import { EvictedAlert } from './EvictedAlert';
import { LowAgentBalanceAlert } from './LowAgentBalanceAlert';
import { LowPearlBalanceAlert } from './LowPearlBalanceAlert';
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
  const { selectedStakingProgramId } = useStakingProgram();
  const { isInitialFunded } = useNeedsFunds(selectedStakingProgramId);

  if (selectedAgentConfig.isUnderConstruction) {
    return <UnderConstructionAlert />;
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

  // Render low-balance alerts. Each component controls its own visibility
  return (
    <>
      <LowPearlBalanceAlert />
      <LowAgentBalanceAlert />
    </>
  );
};
