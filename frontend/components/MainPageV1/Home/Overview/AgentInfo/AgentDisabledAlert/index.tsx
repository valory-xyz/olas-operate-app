import {
  useActiveStakingContractDetails,
  useNeedsFunds,
  useServices,
  useStakingProgram,
} from '@/hooks';

import { EvictedAlert } from './EvictedAlert';
import { LowAgentBalanceAlert } from './LowBalance/LowAgentBalanceAlert';
import { MasterEoaLowBalanceAlert } from './LowBalance/MasterEoaLowBalanceAlert';
import { MasterSafeLowBalanceAlert } from './LowBalance/MasterSafeLowBalanceAlert';
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
  if (isInitialFunded === false && 1 + 1 === 0) return <UnfinishedSetupAlert />;

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
      <LowAgentBalanceAlert />
      <MasterEoaLowBalanceAlert />
      <MasterSafeLowBalanceAlert />
    </>
  );
};
