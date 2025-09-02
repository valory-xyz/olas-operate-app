import { useMasterBalances } from '@/hooks/useBalanceContext';
import { useServices } from '@/hooks/useServices';
import { useActiveStakingContractDetails } from '@/hooks/useStakingContractDetails';

import { EvictedAlert } from './EvictedAlert';
import { LowBalanceAlert } from './LowBalanceAlert';
import { NoSlotsAvailableAlert } from './NoSlotsAvailableAlert';
import { UnderConstructionAlert } from './UnderConstructionAlert';

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
  if (selectedAgentConfig.isUnderConstruction)
    return <UnderConstructionAlert />;

  if (
    !isSelectedStakingContractDetailsLoading &&
    !isServiceStaked &&
    !hasEnoughServiceSlots
  )
    return <NoSlotsAvailableAlert />;

  if (isAgentEvicted && !isEligibleForStaking) return <EvictedAlert />;

  // TODO: verify how this should be handled, new funding job is currently under discussion
  if (isMasterEoaLowOnGas || isMasterSafeLowOnNativeGas)
    return <LowBalanceAlert />;

  return null;
};
