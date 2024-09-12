import { Alert, Skeleton } from 'antd';
import { useMemo } from 'react';

import { InfoBreakdownList } from '@/components/InfoBreakdown';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useStakingContractInfo } from '@/hooks/useStakingContractInfo';

export const StakingContractDetails = ({
  stakingProgramId,
}: {
  stakingProgramId: StakingProgramId;
}) => {
  const { stakingContractInfoRecord } = useStakingContractInfo();

  const balances = useMemo(() => {
    if (!stakingContractInfoRecord) return null;
    if (!stakingProgramId) return null;
    if (!stakingContractInfoRecord?.[stakingProgramId]) return null;

    const details = stakingContractInfoRecord[stakingProgramId];
    return [
      {
        left: 'Rewards per work period',
        right: `~ ${details.rewardsPerWorkPeriod?.toFixed(2)} OLAS`,
      },
      {
        left: 'Annual percentage Yield (APY)',
        right: `${details.apy}%`,
      },
      {
        left: 'Required OLAS for staking',
        right: `${details.olasStakeRequired} OLAS`,
      },
    ];
  }, [stakingContractInfoRecord, stakingProgramId]);

  if (!stakingContractInfoRecord) {
    return <Skeleton active />;
  }

  if (!balances) {
    return (
      <Alert
        message="No staking information available."
        type="error"
        showIcon
      />
    );
  }

  return (
    <InfoBreakdownList
      list={balances}
      parentStyle={{ gap: 12 }}
      color="primary"
    />
  );
};
