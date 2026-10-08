import { Flex, Skeleton } from 'antd';

import { FundingFlow } from '@/components/FundingFlow';
import { cardStyles } from '@/components/ui';
import { SETUP_SCREEN } from '@/constants';
import {
  useBackupSigner,
  useGetRefillRequirements,
  useServices,
  useSetup,
} from '@/hooks';
import { asMiddlewareChain } from '@/utils';
import { isNoStakingProgram } from '@/utils/stakingProgram';

export const FundYourAgent = () => {
  const { goto } = useSetup();
  const { selectedAgentConfig, selectedService } = useServices();
  const backupOwner = useBackupSigner();
  const { refillTokenRequirements, resetTokenRequirements } =
    useGetRefillRequirements();

  // The service is created before this screen; it is only missing while
  // services are still loading after a restart.
  if (!selectedService) {
    return (
      <Flex style={cardStyles}>
        <Skeleton active />
      </Flex>
    );
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
