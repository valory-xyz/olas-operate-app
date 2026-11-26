import { FundingFlow } from '@/components/FundingFlow';
import { CardSkeleton } from '@/components/ui';
import { SETUP_SCREEN } from '@/constants';
import { useGetRefillRequirements, useServices, useSetup } from '@/hooks';
import { asMiddlewareChain } from '@/utils';
import { hasUnstakedOption, isNoStakingProgram } from '@/utils/stakingProgram';

import { BackupSignerGate } from '../BackupSignerGate';

export const FundYourAgent = () => {
  const { goto } = useSetup();
  const { selectedAgentConfig, selectedService } = useServices();
  const { refillTokenRequirements, resetTokenRequirements } =
    useGetRefillRequirements();

  const handleBack = () => {
    resetTokenRequirements();
    // An agent that defaults to no_staking skips SelectStaking unless it can
    // stake on this chain (Connect on Gnosis or Robinhood), so back returns
    // to the step it came from.
    goto(
      isNoStakingProgram(selectedAgentConfig.defaultStakingProgramId) &&
        !hasUnstakedOption(
          selectedAgentConfig,
          selectedAgentConfig.evmHomeChainId,
        )
        ? SETUP_SCREEN.AgentOnboarding
        : SETUP_SCREEN.SelectStaking,
    );
  };

  // The service is created before this screen; it is only missing while
  // services are still loading after a restart.
  if (!selectedService) return <CardSkeleton />;

  return (
    <BackupSignerGate onBack={handleBack}>
      {/* The latched owner: a later status refetch must not change who the Safe is created with. */}
      {(signer) => (
        <FundingFlow
          mode="onboard"
          serviceConfigId={selectedService.service_config_id}
          backupOwner={signer.backupSignerAddress}
          destinationChain={asMiddlewareChain(
            selectedAgentConfig.evmHomeChainId,
          )}
          fallbackToReceive={refillTokenRequirements}
          onBack={handleBack}
        />
      )}
    </BackupSignerGate>
  );
};
