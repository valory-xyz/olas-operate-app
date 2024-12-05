import { InfoCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Popover, Skeleton, Typography } from 'antd';
import { useMemo } from 'react';

import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { NA } from '@/constants/symbols';
import { POPOVER_WIDTH_MEDIUM } from '@/constants/width';
import { getLatestEpochDetails } from '@/graphql/queries';
import { useServices } from '@/hooks/useServices';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { formatToTime } from '@/utils/time';

const { Text } = Typography;

const useEpochEndTime = () => {
  const { selectedAgentConfig } = useServices();
  const chainId = selectedAgentConfig.evmHomeChainId;

  const { activeStakingProgramAddress } = useStakingProgram();

  const { data, isLoading } = useQuery({
    queryKey: REACT_QUERY_KEYS.LATEST_EPOCH_TIME_KEY(
      chainId,
      activeStakingProgramAddress!,
    ),
    queryFn: async () => {
      return await getLatestEpochDetails(chainId, activeStakingProgramAddress!);
    },
    select: (data) => {
      // last epoch end time + epoch length
      return Number(data.blockTimestamp) + Number(data.epochLength);
    },
    enabled: !!activeStakingProgramAddress && !!chainId,
    refetchOnWindowFocus: false,
  });

  return { data, isLoading };
};

export const StakingRewardsThisEpoch = () => {
  const { data: epochEndTimeInMs } = useEpochEndTime();

  const {
    isActiveStakingProgramLoaded,
    activeStakingProgramMeta,
    defaultStakingProgramMeta,
  } = useStakingProgram();

  const stakingProgramMeta = isActiveStakingProgramLoaded
    ? activeStakingProgramMeta || defaultStakingProgramMeta
    : null;

  const popoverContent = useMemo(() => {
    if (!isActiveStakingProgramLoaded) return <Skeleton.Input />;
    if (!activeStakingProgramMeta)
      return (
        <div style={{ maxWidth: POPOVER_WIDTH_MEDIUM }}>
          You&apos;re not yet in a staking program!
        </div>
      );
    return (
      <div style={{ maxWidth: POPOVER_WIDTH_MEDIUM }}>
        The epoch for {stakingProgramMeta?.name} ends each day at ~{' '}
        <Text className="text-sm" strong>
          {epochEndTimeInMs
            ? `${formatToTime(epochEndTimeInMs * 1000)} (UTC)`
            : NA}
        </Text>
      </div>
    );
  }, [
    activeStakingProgramMeta,
    epochEndTimeInMs,
    isActiveStakingProgramLoaded,
    stakingProgramMeta?.name,
  ]);

  return (
    <Text type="secondary">
      Staking rewards this epoch&nbsp;
      <Popover arrow={false} content={popoverContent}>
        <InfoCircleOutlined />
      </Popover>
    </Text>
  );
};
