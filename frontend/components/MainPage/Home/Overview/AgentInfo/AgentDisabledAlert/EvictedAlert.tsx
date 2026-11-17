import { Typography } from 'antd';

import { Alert } from '@/components/ui';
import { useServices } from '@/hooks';
import { useActiveStakingContractDetails } from '@/hooks/useStakingContractDetails';
import { formatToShortDateTime } from '@/utils/time';

const { Text } = Typography;

export const EvictedAlert = () => {
  const { evictionExpiresAt } = useActiveStakingContractDetails();
  const { selectedAgentConfig } = useServices();
  const { canRunWhileEvicted } = selectedAgentConfig;

  return (
    <Alert
      showIcon
      className="mt-16"
      type="warning"
      message={
        <Text className="text-sm">
          <span className="font-weight-600">Agent is temporarily evicted</span>{' '}
          <br />
          {canRunWhileEvicted
            ? "The agent didn't meet staking requirements, and will be evicted until "
            : "The agent didn't meet staking requirements for three consecutive epochs, and will be evicted until "}
          <span className="font-weight-600">
            {formatToShortDateTime(evictionExpiresAt * 1000)} (UTC).
          </span>{' '}
          {canRunWhileEvicted
            ? 'Until then it earns no staking rewards and places no trades. You can still run it to collect winnings from past trades.'
            : 'You can run it again after the eviction period ends.'}
        </Text>
      }
    />
  );
};
