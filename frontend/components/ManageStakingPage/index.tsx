import { CloseOutlined } from '@ant-design/icons';
import { Button, Card } from 'antd';

import { STAKING_PROGRAM_META } from '@/constants/stakingProgramMeta';
import { Pages } from '@/enums/PageState';
import { StakingProgram } from '@/enums/StakingProgram';
import { usePageState } from '@/hooks/usePageState';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { CardTitle } from '../Card/CardTitle';
import { CardSection } from '../styled/CardSection';
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
  const otherStakingContracts = orderedStakingPrograms.filter(
    (stakingProgram) => {
      const info = STAKING_PROGRAM_META[stakingProgram];
      if (!info) return false;
      if (activeStakingContract === stakingProgram) return false;
      if (info.deprecated) return false;
      return true;
    },
  );

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

      <CardSection borderbottom="true" vertical gap={16}>
        {`Browse ${otherStakingContracts.length} staking contract${otherStakingContracts.length > 1 ? 's' : ''}.`}
      </CardSection>

      {otherStakingContracts.map((stakingProgram) => (
        <StakingContractSection
          key={stakingProgram}
          stakingProgram={stakingProgram}
        />
      ))}
    </Card>
  );
};
