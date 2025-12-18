import { Flex } from 'antd';
import { isNil } from 'lodash';
import { useCallback } from 'react';

import { Bridge } from '@/components/Bridge';
import { AllEvmChainIdMap, SETUP_SCREEN } from '@/constants';
import { useMasterWalletContext, useServices, useSetup } from '@/hooks';

import { useGetBridgeRequirementsParams } from '../hooks/useGetBridgeRequirementsParams';

export const SetupBridgeOnboarding = () => {
  const { goto: gotoSetup, prevState } = useSetup();
  const { selectedAgentConfig } = useServices();
  const { getMasterSafeOf, isFetched: isMasterWalletFetched } =
    useMasterWalletContext();
  const toMiddlewareChain = selectedAgentConfig.middlewareHomeChainId;

  // Bridging is supported only for Ethereum at the moment.
  const getBridgeRequirementsParams = useGetBridgeRequirementsParams(
    AllEvmChainIdMap.Ethereum,
  );

  const handlePrevStep = useCallback(() => {
    gotoSetup(prevState ?? SETUP_SCREEN.FundYourAgent);
  }, [gotoSetup, prevState]);

  const hasMasterSafe = isMasterWalletFetched
    ? !isNil(getMasterSafeOf?.(selectedAgentConfig.evmHomeChainId))
    : false;

  return (
    <Flex vertical className="pt-36">
      <Bridge
        enabledStepsAfterBridging={
          hasMasterSafe ? undefined : ['masterSafeCreationAndTransfer']
        }
        bridgeToChain={toMiddlewareChain}
        getBridgeRequirementsParams={getBridgeRequirementsParams}
        onPrevBeforeBridging={handlePrevStep}
        isOnboarding
      />
    </Flex>
  );
};
