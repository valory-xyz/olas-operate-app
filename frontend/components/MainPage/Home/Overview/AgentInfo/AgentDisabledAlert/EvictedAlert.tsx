import { Typography } from 'antd';

import { Alert } from '@/components/ui';
import { AgentMap } from '@/constants';
import { useServices } from '@/hooks';
import { useActiveStakingContractDetails } from '@/hooks/useStakingContractDetails';
import { formatToShortDateTime } from '@/utils/time';

const { Text } = Typography;

/** Why the agent is evicted, and what that means for it until the end date. */
const getEvictionCopy = (
  isConnect: boolean,
  canRunWhileEvicted: boolean | undefined,
) => {
  if (isConnect) {
    return {
      reason:
        "The agent didn't make its Marketplace request in two epochs in a row, and will be evicted until ",
      consequence:
        'Until then it earns no staking rewards. You can keep using it from your coding tool.',
    };
  }
  if (canRunWhileEvicted) {
    return {
      reason:
        "The agent didn't meet staking requirements, and will be evicted until ",
      consequence:
        'Until then it earns no staking rewards and places no trades. You can still run it to collect winnings from past trades.',
    };
  }
  return {
    reason:
      "The agent didn't meet staking requirements for three consecutive epochs, and will be evicted until ",
    consequence: 'You can run it again after the eviction period ends.',
  };
};

export const EvictedAlert = () => {
  const { evictionExpiresAt } = useActiveStakingContractDetails();
  const { selectedAgentConfig, selectedAgentType } = useServices();
  const { canRunWhileEvicted } = selectedAgentConfig;
  const { reason, consequence } = getEvictionCopy(
    selectedAgentType === AgentMap.Connect,
    canRunWhileEvicted,
  );

  return (
    <Alert
      showIcon
      className="mt-16"
      type="warning"
      message={
        <Text className="text-sm">
          <span className="font-weight-600">Agent is temporarily evicted</span>{' '}
          <br />
          {reason}
          <span className="font-weight-600">
            {formatToShortDateTime(evictionExpiresAt * 1000)} (UTC).
          </span>{' '}
          {consequence}
        </Text>
      }
    />
  );
};
