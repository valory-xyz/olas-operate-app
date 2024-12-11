import { Alert, Skeleton } from 'antd';
import { useMemo } from 'react';

import { InfoBreakdownList } from '@/components/InfoBreakdown';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useStakingContractContext } from '@/hooks/useStakingContractDetails';

export const StakingContractDetails = ({
  stakingProgramId,
}: {
  stakingProgramId: StakingProgramId;
}) => {
  const {
    allStakingContractDetailsRecord,
    isAllStakingContractDetailsRecordLoaded,
  } = useStakingContractContext();

  const list = useMemo(() => {
    if (!isAllStakingContractDetailsRecordLoaded) return;
    if (!allStakingContractDetailsRecord) return;
    if (!stakingProgramId) return;
    if (!allStakingContractDetailsRecord?.[stakingProgramId]) return;

    const details = allStakingContractDetailsRecord[stakingProgramId];

    return [
      {
        left: 'Available slots',
        right: `${details.maxNumServices! - details.serviceIds!.length} / ${details.maxNumServices}`,
      },
      {
        left: 'Rewards per epoch',
        right: `~ ${details.rewardsPerWorkPeriod?.toFixed(2)} OLAS`,
      },
      {
        left: 'Estimated Annual Percentage Yield (APY)',
        right: `${details.apy}%`,
        leftClassName: 'max-width-200',
      },
      {
        left: 'Required OLAS for staking',
        right: `${details.olasStakeRequired} OLAS`,
      },
    ];
  }, [
    isAllStakingContractDetailsRecordLoaded,
    allStakingContractDetailsRecord,
    stakingProgramId,
  ]);

  if (!isAllStakingContractDetailsRecordLoaded) {
    return <Skeleton active />;
  }

  if (!allStakingContractDetailsRecord || !list || list.length === 0) {
    return (
      <Alert
        message="No staking information available."
        type="error"
        showIcon
      />
    );
  }

  return (
    <InfoBreakdownList list={list!} parentStyle={{ gap: 12 }} color="primary" />
  );
};
