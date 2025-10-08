import { Flex } from 'antd';
import { useCallback } from 'react';

import { Bridge } from '@/components/Bridge/Bridge';
import { AllEvmChainIdMap } from '@/constants/chains';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';

import { useGetBridgeRequirementsParams } from '../hooks/useGetBridgeRequirementsParams';

const BRIDGE_FROM_MESSAGE =
  'Send the specified amounts from your external wallet to the Pearl Wallet address below. Pearl will automatically detect your transfer and bridge the funds for you.';

export const SetupBridgeOnboarding = () => {
  const { goto: gotoSetup, prevState } = useSetup();

  // Bridging is supported only for Ethereum at the moment.
  const getBridgeRequirementsParams = useGetBridgeRequirementsParams(
    AllEvmChainIdMap.Ethereum,
  );

  const handlePrevStep = useCallback(() => {
    gotoSetup(prevState ?? SetupScreen.FundYourAgent);
  }, [gotoSetup, prevState]);

  return (
    <Flex className="pt-48">
      <Bridge
        enabledStepsAfterBridging={['masterSafeCreationAndTransfer']}
        bridgeFromDescription={BRIDGE_FROM_MESSAGE}
        getBridgeRequirementsParams={getBridgeRequirementsParams}
        onPrevBeforeBridging={handlePrevStep}
        isOnboarding
      />
    </Flex>
  );
};
