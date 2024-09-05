import { CloseOutlined } from '@ant-design/icons';
import { Button, Card } from 'antd';

import { Pages } from '@/enums/PageState';
import { StakingProgram } from '@/enums/StakingProgram';
import { usePageState } from '@/hooks/usePageState';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { CardTitle } from '../Card/CardTitle';
import { StakingContractSection } from './StakingContractSection';
import { WhatAreStakingContractsSection } from './WhatAreStakingContracts';

export const ManageStakingPage = () => {
  const { goto } = usePageState();
  const { activeStakingProgram } = useStakingProgram();

  const orderedStakingPrograms: StakingProgram[] = Object.values(
    StakingProgram,
  ).reduce((acc: StakingProgram[], stakingProgram: StakingProgram) => {
    // put the active staking program at the top
    if (stakingProgram === activeStakingProgram) {
      return [stakingProgram, ...acc];
    }

    // otherwise, append to the end
    return [...acc, stakingProgram];
  }, []);

  const activeStakingContract = orderedStakingPrograms[0];
  const otherStakingContracts = orderedStakingPrograms.slice(1);

  return (
    <Card
      title={<CardTitle title="Manage staking contract" />}
      bordered={false}
      extra={
        <Button
          size="large"
          icon={<CloseOutlined />}
          onClick={() => goto(Pages.Main)}
        />
      }
    >
      <WhatAreStakingContractsSection />
      <StakingContractSection stakingProgram={activeStakingContract} />
      {otherStakingContracts.map((stakingProgram) => (
        <StakingContractSection
          key={stakingProgram}
          stakingProgram={stakingProgram}
        />
      ))}
    </Card>
  );
};
