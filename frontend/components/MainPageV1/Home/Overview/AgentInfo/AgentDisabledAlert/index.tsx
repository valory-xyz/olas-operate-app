import { useMasterBalances } from '@/hooks/useBalanceContext';
import { useNeedsFunds } from '@/hooks/useNeedsFunds';
import { useServices } from '@/hooks/useServices';
import { useActiveStakingContractDetails } from '@/hooks/useStakingContractDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { EvictedAlert } from './EvictedAlert';
import { LowBalanceAlert } from './LowBalanceAlert';
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
  const { isMasterEoaLowOnGas, isMasterSafeLowOnNativeGas } =
    useMasterBalances();
  const { selectedStakingProgramId } = useStakingProgram();
  const { isInitialFunded } = useNeedsFunds(selectedStakingProgramId);

  // The "store" is `undefined` during updates, hence waiting till we get the correct value from the store.
  if (isInitialFunded === false) return <UnfinishedSetupAlert />;

  if (selectedAgentConfig.isUnderConstruction) {
    return <UnderConstructionAlert />;
  }

  if (
    !isSelectedStakingContractDetailsLoading &&
    !isServiceStaked &&
    !hasEnoughServiceSlots
  ) {
    return <NoSlotsAvailableAlert />;
  }

  if (isAgentEvicted && !isEligibleForStaking) return <EvictedAlert />;

  // TODO: verify how this should be handled, new funding job is currently under discussion
  if (isMasterEoaLowOnGas || isMasterSafeLowOnNativeGas) {
    return <LowBalanceAlert />;
  }

  return null;
};
