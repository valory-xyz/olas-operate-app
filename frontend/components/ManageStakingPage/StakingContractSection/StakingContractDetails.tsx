import { Alert, Skeleton } from 'antd';
import { useMemo } from 'react';

import { InfoBreakdownList } from '@/components/InfoBreakdown';
import { StakingProgram } from '@/enums/StakingProgram';
import { useStakingContractInfo } from '@/hooks/useStakingContractInfo';

export const StakingContractDetails = ({ name }: { name: StakingProgram }) => {
  const { stakingContractInfoRecord } = useStakingContractInfo();

  const balances = useMemo(() => {
    if (!stakingContractInfoRecord) return null;
    if (!name) return null;
    if (!stakingContractInfoRecord?.[name]) return null;

    const details = stakingContractInfoRecord[name];
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
  }, [stakingContractInfoRecord, name]);

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
