import { Flex } from 'antd';
import { isNil } from 'lodash';
import { useCallback } from 'react';

import { Bridge } from '@/components/Bridge';
import { AllEvmChainIdMap } from '@/constants';
import { SetupScreen } from '@/enums/SetupScreen';
import { useMasterWalletContext, useServices, useSetup } from '@/hooks';

import { useGetBridgeRequirementsParams } from '../hooks/useGetBridgeRequirementsParams';

const BRIDGE_FROM_MESSAGE =
  'Send the specified amounts from your external wallet to the Pearl Wallet address below. Pearl will automatically detect your transfer and bridge the funds for you.';

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
    gotoSetup(prevState ?? SetupScreen.FundYourAgent);
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
        bridgeFromDescription={BRIDGE_FROM_MESSAGE}
        bridgeToChain={toMiddlewareChain}
        getBridgeRequirementsParams={getBridgeRequirementsParams}
        onPrevBeforeBridging={handlePrevStep}
        isOnboarding
      />
    </Flex>
  );
};
