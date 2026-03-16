import { Typography } from 'antd';

import { Alert } from '@/components/ui';
import { useActiveStakingContractDetails } from '@/hooks/useStakingContractDetails';
import { formatToShortDateTime } from '@/utils/time';

const { Text } = Typography;

export const EvictedAlert = () => {
  const { evictionExpiresAt } = useActiveStakingContractDetails();

  return (
    <Alert
      showIcon
      className="mt-16"
      type="warning"
      message={
        <Text className="text-sm">
          <span className="font-weight-600">Agent is temporarily evicted</span>{' '}
          <br />
          The agent didn&apos;t meet staking requirements for three consecutive
          epochs, and will be evicted until{' '}
          <span className="font-weight-600">
            {formatToShortDateTime(evictionExpiresAt * 1000)} (UTC).
          </span>{' '}
          You can run it again after the eviction period ends.
        </Text>
      }
    />
  );
};
