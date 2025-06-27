import { useCallback } from 'react';

import { Bridge } from '@/components/Bridge/Bridge';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';

import { useGetBridgeRequirementsParams } from './useGetBridgeRequirementsParams';

const BRIDGE_FROM_MESSAGE =
  'The bridged amount covers all funds required to create your account and run your agent, including fees. No further funds will be needed.';

export const SetupBridgeOnboarding = () => {
  const { goto: gotoSetup } = useSetup();
  const getBridgeRequirementsParams = useGetBridgeRequirementsParams();

  const handlePrevStep = useCallback(() => {
    gotoSetup(SetupScreen.SetupEoaFunding);
  }, [gotoSetup]);

  return (
    <Bridge
      enabledStepsAfterBridging={['masterSafeCreationAndTransfer']}
      bridgeFromDescription={BRIDGE_FROM_MESSAGE}
      getBridgeRequirementsParams={getBridgeRequirementsParams}
      onPrevBeforeBridging={handlePrevStep}
    />
  );
};
