import { Flex } from 'antd';
import { useCallback, useState } from 'react';

import { Bridge } from '@/components/Bridge';
import { AgentSetupCompleteModal } from '@/components/ui';
import { AgentMap, AllEvmChainIdMap, SETUP_SCREEN } from '@/constants';
import { useGetBridgeRequirementsParams, useServices, useSetup } from '@/hooks';
import { asAllMiddlewareChain } from '@/utils/middlewareHelpers';

import { BackupSignerGate } from '../../BackupSignerGate';

export const SetupBridgeOnboarding = () => {
  const [isBridgeCompleted, setIsBridgeCompleted] = useState(false);

  const { goto: gotoSetup, prevState } = useSetup();
  const { selectedAgentConfig, selectedAgentType } = useServices();

  // Determine the from chain based on the agent's home chain
  const toMiddlewareChain = selectedAgentConfig.middlewareHomeChainId;
  const fromChainId = AllEvmChainIdMap.Ethereum;
  const fromChain = asAllMiddlewareChain(fromChainId);

  const getBridgeRequirementsParams =
    useGetBridgeRequirementsParams(fromChainId);

  const handlePrevStep = useCallback(() => {
    gotoSetup(prevState ?? SETUP_SCREEN.FundYourAgent);
  }, [gotoSetup, prevState]);

  const handleBridgingCompleted = useCallback(() => {
    setIsBridgeCompleted(true);
  }, [setIsBridgeCompleted]);

  return (
    <Flex vertical className="pt-36">
      {/* The bridge creates the Pearl Safe after bridging, with this screen's latched signer. */}
      <BackupSignerGate>
        {() => (
          <Bridge
            mode="onboard"
            fromChain={fromChain}
            bridgeToChain={toMiddlewareChain}
            getBridgeRequirementsParams={getBridgeRequirementsParams}
            onPrevBeforeBridging={handlePrevStep}
            onBridgingCompleted={handleBridgingCompleted}
            showAgentCustodyAlert={selectedAgentType === AgentMap.Connect}
          />
        )}
      </BackupSignerGate>
      {isBridgeCompleted && <AgentSetupCompleteModal />}
    </Flex>
  );
};
