import { Flex } from 'antd';
import { useCallback, useState } from 'react';

import { Bridge } from '@/components/Bridge';
import { AgentSetupCompleteModal } from '@/components/ui';
import { AllEvmChainIdMap, SETUP_SCREEN } from '@/constants';
import { useGetBridgeRequirementsParams, useServices, useSetup } from '@/hooks';

export const SetupBridgeOnboarding = () => {
  const [isBridgeCompleted, setIsBridgeCompleted] = useState(false);

  const { goto: gotoSetup, prevState } = useSetup();
  const { selectedAgentConfig } = useServices();
  const getBridgeRequirementsParams = useGetBridgeRequirementsParams(
    AllEvmChainIdMap.Ethereum,
  );

  const toMiddlewareChain = selectedAgentConfig.middlewareHomeChainId;

  const handlePrevStep = useCallback(() => {
    gotoSetup(prevState ?? SETUP_SCREEN.FundYourAgent);
  }, [gotoSetup, prevState]);

  const handleBridgingCompleted = useCallback(() => {
    setIsBridgeCompleted(true);
  }, [setIsBridgeCompleted]);

  return (
    <Flex vertical className="pt-36">
      <Bridge
        mode="onboard"
        bridgeToChain={toMiddlewareChain}
        getBridgeRequirementsParams={getBridgeRequirementsParams}
        onPrevBeforeBridging={handlePrevStep}
        onBridgingCompleted={handleBridgingCompleted}
      />
      {isBridgeCompleted && <AgentSetupCompleteModal />}
    </Flex>
  );
};
