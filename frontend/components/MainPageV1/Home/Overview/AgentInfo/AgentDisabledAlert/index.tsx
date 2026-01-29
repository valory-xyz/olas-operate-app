import { AgentLowBalanceAlert } from '@/components/AgentLowBalanceAlert';
import { PAGES } from '@/constants';
import {
  useActiveStakingContractDetails,
  useAgentRunning,
  useIsInitiallyFunded,
  usePageState,
  useServices,
  useStakingProgram,
} from '@/hooks';

import { AgentRunningAlert } from './AgentRunningAlert';
import { ContractDeprecatedAlert } from './ContractDeprecatedAlert';
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
  const { selectedStakingProgramMeta, activeStakingProgramId } =
    useStakingProgram();

  if (selectedAgentConfig.isUnderConstruction) {
    return <UnderConstructionAlert />;
  }

  if (isAnotherAgentRunning) {
    return <AgentRunningAlert />;
  }

  // The "store" is `undefined` during updates, hence waiting till we get the correct value from the store.
  if (isInitialFunded === false) return <UnfinishedSetupAlert />;

  // Only show deprecated alert if:
  // 1. The selected staking program is marked as deprecated
  // 2. AND there's an active staking program on-chain (meaning the agent has been staked before)
  // This prevents showing the alert during onboarding when a deprecated program is selected but the service is not yet staked
  if (
    selectedStakingProgramMeta &&
    selectedStakingProgramMeta.deprecated &&
    activeStakingProgramId
  ) {
    return (
      <ContractDeprecatedAlert
        stakingProgramName={selectedStakingProgramMeta.name}
      />
    );
  }

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
