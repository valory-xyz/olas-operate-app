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

  const otherStakingPrograms = orderedStakingPrograms.filter(
    (stakingProgram) => {
      const info = STAKING_PROGRAM_META[stakingProgram];
      if (!info) return false;
      if (activeStakingProgram === stakingProgram) return false;
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

      {activeStakingProgram && (
        <StakingContractSection stakingProgram={orderedStakingPrograms[0]} />
      )}

      <CardSection borderbottom="true" vertical gap={16}>
        {`Browse ${otherStakingPrograms.length} staking contract${otherStakingPrograms.length > 1 ? 's' : ''}.`}
      </CardSection>

      {otherStakingPrograms.map((stakingProgram) => (
        <StakingContractSection
          key={stakingProgram}
          stakingProgram={stakingProgram}
        />
      ))}
    </Card>
  );
};
