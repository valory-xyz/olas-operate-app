import { Typography } from 'antd';

import { Alert } from '@/components/ui';
import { AgentMap } from '@/constants';
import { useServices } from '@/hooks';
import { useActiveStakingContractDetails } from '@/hooks/useStakingContractDetails';
import { formatToShortDateTime } from '@/utils/time';

const { Text } = Typography;

export const EvictedAlert = () => {
  const { evictionExpiresAt } = useActiveStakingContractDetails();
  const { selectedAgentConfig, selectedAgentType } = useServices();
  const { canRunWhileEvicted } = selectedAgentConfig;
  const isConnect = selectedAgentType === AgentMap.Connect;

  return (
    <Alert
      showIcon
      className="mt-16"
      type="warning"
      message={
        <Text className="text-sm">
          <span className="font-weight-600">Agent is temporarily evicted</span>{' '}
          <br />
          {isConnect
            ? "The agent didn't make its Marketplace request in two epochs in a row, and will be evicted until "
            : canRunWhileEvicted
              ? "The agent didn't meet staking requirements, and will be evicted until "
              : "The agent didn't meet staking requirements for three consecutive epochs, and will be evicted until "}
          <span className="font-weight-600">
            {formatToShortDateTime(evictionExpiresAt * 1000)} (UTC).
          </span>{' '}
          {isConnect
            ? 'Until then it earns no staking rewards. You can keep using it from your coding tool.'
            : canRunWhileEvicted
              ? 'Until then it earns no staking rewards and places no trades. You can still run it to collect winnings from past trades.'
              : 'You can run it again after the eviction period ends.'}
        </Text>
      }
    />
  );
};
