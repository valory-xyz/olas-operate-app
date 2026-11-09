import { FundingFlow } from '@/components/FundingFlow';
import { CardSkeleton } from '@/components/ui';
import { SETUP_SCREEN } from '@/constants';
import { useGetRefillRequirements, useServices, useSetup } from '@/hooks';
import { asMiddlewareChain } from '@/utils';
import { isNoStakingProgram } from '@/utils/stakingProgram';

import { BackupSignerGate } from '../BackupSignerGate';

export const FundYourAgent = () => {
  const { goto } = useSetup();
  const { selectedAgentConfig, selectedService } = useServices();
  const { refillTokenRequirements, resetTokenRequirements } =
    useGetRefillRequirements();

  const handleBack = () => {
    resetTokenRequirements();
    // Connect (and any no_staking agent) skips SelectStaking, so back
    // must return to the agent/chain step, not the staking screen.
    goto(
      isNoStakingProgram(selectedAgentConfig.defaultStakingProgramId)
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
