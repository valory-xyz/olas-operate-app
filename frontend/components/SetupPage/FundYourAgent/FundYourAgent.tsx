import { FundingFlow } from '@/components/FundingFlow';
import { SETUP_SCREEN } from '@/constants';
import {
  useBackupSigner,
  useGetRefillRequirements,
  useServices,
  useSetup,
} from '@/hooks';
import { asMiddlewareChain } from '@/utils';

/**
 * Fund a new agent with one transfer from any supported chain and token.
 */
export const FundYourAgent = () => {
  const { goto } = useSetup();
  const { selectedAgentConfig, selectedService } = useServices();
  const backupOwner = useBackupSigner();
  const { refillTokenRequirements, resetTokenRequirements } =
    useGetRefillRequirements();

  return (
    <FundingFlow
      mode="onboard"
      serviceConfigId={selectedService?.service_config_id}
      backupOwner={backupOwner}
      destinationChain={asMiddlewareChain(selectedAgentConfig.evmHomeChainId)}
      fallbackToReceive={refillTokenRequirements}
      onBack={() => {
        resetTokenRequirements();
        // Connect (and any no_staking agent) skips SelectStaking, so back
        // must return to the agent/chain step, not the staking screen.
        goto(
          selectedAgentConfig.defaultStakingProgramId === 'no_staking'
            ? SETUP_SCREEN.AgentOnboarding
            : SETUP_SCREEN.SelectStaking,
        );
      }}
    />
  );
};
