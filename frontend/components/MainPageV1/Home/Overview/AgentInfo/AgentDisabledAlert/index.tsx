import { AgentLowBalanceAlert } from '@/components/AgentLowBalanceAlert';
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

  if (selectedAgentConfig?.isGeoLocationRestricted && isAgentGeoRestricted) {
    return <AgentGeoBlockedAlert />;
  }

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
      <AgentLowBalanceAlert onFund={() => goto(PAGES.AgentWallet)} />
      <MasterEoaLowBalanceAlert />
    </>
  );
};
