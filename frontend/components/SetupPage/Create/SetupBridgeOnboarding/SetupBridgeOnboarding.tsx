import { Flex } from 'antd';
import { isNil } from 'lodash';
import { useCallback, useState } from 'react';

import { Bridge } from '@/components/Bridge';
import { AgentSetupCompleteModal } from '@/components/ui';
import { AllEvmChainIdMap, SETUP_SCREEN } from '@/constants';
import { useMasterWalletContext, useServices, useSetup } from '@/hooks';

import { useGetBridgeRequirementsParams } from '../hooks/useGetBridgeRequirementsParams';

export const SetupBridgeOnboarding = () => {
  const [isBridgeCompleted, setIsBridgeCompleted] = useState(false);

  const { goto: gotoSetup, prevState } = useSetup();
  const { selectedAgentConfig } = useServices();
  const { getMasterSafeOf, isFetched: isMasterWalletFetched } =
    useMasterWalletContext();
  const getBridgeRequirementsParams = useGetBridgeRequirementsParams(
    AllEvmChainIdMap.Ethereum,
  );

  const toMiddlewareChain = selectedAgentConfig.middlewareHomeChainId;
  const hasMasterSafe = isMasterWalletFetched
    ? !isNil(getMasterSafeOf?.(selectedAgentConfig.evmHomeChainId))
    : false;

  const handlePrevStep = useCallback(() => {
    gotoSetup(prevState ?? SETUP_SCREEN.FundYourAgent);
  }, [gotoSetup, prevState]);

  const handleBridgingCompleted = useCallback(() => {
    setIsBridgeCompleted(true);
  }, [setIsBridgeCompleted]);

  return (
    <Flex vertical className="pt-36">
      <Bridge
        enabledStepsAfterBridging={
          hasMasterSafe ? undefined : ['masterSafeCreationAndTransfer']
        }
        bridgeToChain={toMiddlewareChain}
        getBridgeRequirementsParams={getBridgeRequirementsParams}
        onPrevBeforeBridging={handlePrevStep}
        onBridgingCompleted={handleBridgingCompleted}
        isOnboarding
      />
      {isBridgeCompleted && <AgentSetupCompleteModal />}
    </Flex>
  );
};
