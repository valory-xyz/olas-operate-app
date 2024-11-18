import { Alert, Skeleton } from 'antd';
import { useMemo } from 'react';

import { InfoBreakdownList } from '@/components/InfoBreakdown';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useStakingContractContext } from '@/hooks/useStakingContractInfo';

export const StakingContractDetails = ({
  stakingProgramId,
}: {
  stakingProgramId: StakingProgramId;
}) => {
  const {
    allStakingContractDetailsList,
    isAllStakingContractDetailsListLoaded,
  } = useStakingContractContext();

  const list = useMemo(() => {
    if (!isAllStakingContractDetailsListLoaded) return;
    if (!allStakingContractDetailsList) return;
    if (!stakingProgramId) return;
    if (!allStakingContractDetailsList?.[stakingProgramId]) return;

    const details = allStakingContractDetailsList[stakingProgramId];

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
    isAllStakingContractDetailsListLoaded,
    allStakingContractDetailsList,
    stakingProgramId,
  ]);

  if (!isAllStakingContractDetailsListLoaded) {
    return <Skeleton active />;
  }

  if (!allStakingContractDetailsList) {
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
