import { AgentLowBalanceAlert } from '@/components/AgentLowBalanceAlert';
import { Pages } from '@/enums';
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
  const isAnotherAgentRunning = useAgentRunning();
  const { selectedStakingProgramMeta } = useStakingProgram();

  if (selectedAgentConfig.isUnderConstruction) {
    return <UnderConstructionAlert />;
  }

  if (isAnotherAgentRunning) {
    return <AgentRunningAlert />;
  }

  // The "store" is `undefined` during updates, hence waiting till we get the correct value from the store.
  if (isInitialFunded === false) return <UnfinishedSetupAlert />;

  if (selectedStakingProgramMeta && selectedStakingProgramMeta.deprecated) {
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
      <AgentLowBalanceAlert onFund={() => goto(Pages.AgentWallet)} />
      <MasterEoaLowBalanceAlert />
    </>
  );
};
