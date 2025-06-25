import { Bridge } from '@/components/bridge/Bridge';

import { useGetBridgeRequirementsParams } from './useGetBridgeRequirementsParams';

const BRIDGE_FROM_MESSAGE =
  'The bridged amount covers all funds required to create your account and run your agent, including fees. No further funds will be needed.';

export const SetupBridgeOnboarding = () => {
  const getBridgeRequirementsParams = useGetBridgeRequirementsParams();

  return (
    <Bridge
      showCompleteScreen={false}
      getBridgeRequirementsParams={getBridgeRequirementsParams}
      bridgeFromMessage={BRIDGE_FROM_MESSAGE}
    />
  );
};
