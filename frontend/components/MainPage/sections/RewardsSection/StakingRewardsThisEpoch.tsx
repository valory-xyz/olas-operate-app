import { InfoCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Popover, Typography } from 'antd';

import { getLatestEpochDetails } from '@/graphql/queries';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { formatToTime } from '@/utils/time';

const { Text } = Typography;

const useEpochEndTime = () => {
  const { activeStakingProgramAddress } = useStakingProgram();

  const { data, isLoading } = useQuery({
    queryKey: ['latestEpochTime'],
    queryFn: async () => {
      return await getLatestEpochDetails(activeStakingProgramAddress as string);
    },
    select: (data) => {
      // last epoch end time + epoch length
      return Number(data.blockTimestamp) + Number(data.epochLength);
    },
    enabled: !!activeStakingProgramAddress,
  });

  return { data, isLoading };
};

export const StakingRewardsThisEpoch = () => {
  const { data: epochEndTimeInMs } = useEpochEndTime();

  return (
    <Text type="secondary">
      Staking rewards this epoch&nbsp;
      <Popover
        arrow={false}
        content={
          <>
            The epoch ends each day at ~{' '}
            <Text className="text-sm" strong>
              {epochEndTimeInMs
                ? `${formatToTime(epochEndTimeInMs * 1000)} (UTC)`
                : '--'}
            </Text>
          </>
        }
      >
        <InfoCircleOutlined />
      </Popover>
    </Text>
  );
};
