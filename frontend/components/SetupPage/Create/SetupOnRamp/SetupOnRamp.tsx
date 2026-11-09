import { Flex, Skeleton } from 'antd';
import { useCallback } from 'react';

import { OnRamp } from '@/components/OnRamp';
import { cardStyles } from '@/components/ui';
import { AddressZero, ON_RAMP_CHAIN_MAP, SETUP_SCREEN } from '@/constants';
import {
  useBackupSignerGuard,
  useGetBridgeRequirementsParams,
  useServices,
  useSetup,
} from '@/hooks';
import { asMiddlewareChain } from '@/utils';

export const SetupOnRamp = () => {
  const { goto: gotoSetup, prevState } = useSetup();
  const { selectedAgentConfig } = useServices();
  const { isBackupSignerReady } = useBackupSignerGuard();

  // Calculate onRampChainId based on agent's home chain
  const agentChainName = asMiddlewareChain(selectedAgentConfig.evmHomeChainId);
  const onRampChainId = ON_RAMP_CHAIN_MAP[agentChainName].chain;

  // Get requirements params function (use 'to' direction for on-ramping)
  const getOnRampRequirementsParams = useGetBridgeRequirementsParams(
    onRampChainId,
    AddressZero,
    'to',
  );

  const handleBack = useCallback(() => {
    gotoSetup(prevState ?? SETUP_SCREEN.FundYourAgent);
  }, [gotoSetup, prevState]);

  // The on-ramp ends by creating the Pearl Safe with the backup signer.
  if (!isBackupSignerReady) {
    return (
      <Flex style={cardStyles}>
        <Skeleton active />
      </Flex>
    );
  }

  return (
    <OnRamp
      mode="onboard"
      getOnRampRequirementsParams={getOnRampRequirementsParams}
      handleBack={handleBack}
    />
  );
};
