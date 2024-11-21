import { InfoCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Popover, Typography } from 'antd';

import { POPOVER_WIDTH_MEDIUM } from '@/constants/width';
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
  const {
    activeStakingProgramMeta,
    activeStakingProgramId,
    isActiveStakingProgramLoaded,
  } = useStakingProgram();

  const stakingProgramMeta = activeStakingProgramMeta;

  return (
    <Text type="secondary">
      Staking rewards this epoch&nbsp;
      <Popover
        arrow={false}
        content={
          isActiveStakingProgramLoaded && activeStakingProgramId ? (
            <div style={{ maxWidth: POPOVER_WIDTH_MEDIUM }}>
              The epoch for {stakingProgramMeta?.name} ends each day at ~{' '}
              <Text className="text-sm" strong>
                {epochEndTimeInMs
                  ? `${formatToTime(epochEndTimeInMs * 1000)} (UTC)`
                  : '--'}
              </Text>
            </div>
          ) : (
            <div style={{ maxWidth: POPOVER_WIDTH_MEDIUM }}>
              You&apos;re not yet in a staking program!
            </div>
          )
        }
      >
        <InfoCircleOutlined />
      </Popover>
    </Text>
  );
};
