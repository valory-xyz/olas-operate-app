import { FundingFlow } from '@/components/FundingFlow';
import { CardSkeleton } from '@/components/ui';
import { SETUP_SCREEN } from '@/constants';
import {
  useBackupSignerGuard,
  useGetRefillRequirements,
  useServices,
  useSetup,
} from '@/hooks';
import { asMiddlewareChain } from '@/utils';
import { isNoStakingProgram } from '@/utils/stakingProgram';

import { BackupSignerUnavailable } from '../BackupSignerUnavailable';

export const FundYourAgent = () => {
  const { goto } = useSetup();
  const { selectedAgentConfig, selectedService } = useServices();
  // The latched owner: a later status refetch must not change who the Safe is created with.
  const {
    isBackupSignerReady,
    isBackupSignerError,
    backupSignerAddress: backupOwner,
  } = useBackupSignerGuard();
  const { refillTokenRequirements, resetTokenRequirements } =
    useGetRefillRequirements();

  // The service is created before this screen; it is only missing while
  // services are still loading after a restart. The backup signer must be
  // settled before the funding run can create the Pearl Safe with it.
  if (isBackupSignerError) return <BackupSignerUnavailable />;
  if (!selectedService || !isBackupSignerReady) {
    return <CardSkeleton />;
  }

  return (
    <FundingFlow
      mode="onboard"
      serviceConfigId={selectedService.service_config_id}
      backupOwner={backupOwner}
      destinationChain={asMiddlewareChain(selectedAgentConfig.evmHomeChainId)}
      fallbackToReceive={refillTokenRequirements}
      onBack={() => {
        resetTokenRequirements();
        // Connect (and any no_staking agent) skips SelectStaking, so back
        // must return to the agent/chain step, not the staking screen.
        goto(
          isNoStakingProgram(selectedAgentConfig.defaultStakingProgramId)
            ? SETUP_SCREEN.AgentOnboarding
            : SETUP_SCREEN.SelectStaking,
        );
      }}
    />
  );
};
