import { CloseOutlined } from '@ant-design/icons';
import { Button, Card } from 'antd';

import { STAKING_PROGRAM_META } from '@/constants/stakingProgramMeta';
import { Pages } from '@/enums/PageState';
import { StakingProgramId } from '@/enums/StakingProgram';
import { usePageState } from '@/hooks/usePageState';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { CardTitle } from '../Card/CardTitle';
import { CardSection } from '../styled/CardSection';
import { StakingContractSection } from './StakingContractSection';
import { WhatAreStakingContractsSection } from './WhatAreStakingContracts';

export const ManageStakingPage = () => {
  const { goto } = usePageState();
  const { activeStakingProgramId, defaultStakingProgramId } =
    useStakingProgram();

  const orderedStakingProgramIds: StakingProgramId[] = Object.values(
    StakingProgramId,
  ).reduce((acc: StakingProgramId[], stakingProgramId: StakingProgramId) => {
    // put the active staking program at the top
    if (stakingProgramId === activeStakingProgramId) {
      return [stakingProgramId, ...acc];
    }

    // put default at the top if no activeStakingProgram
    if (
      activeStakingProgramId === null &&
      stakingProgramId === defaultStakingProgramId
    )
      return [stakingProgramId, ...acc];

    // if the program is deprecated, ignore it
    if (STAKING_PROGRAM_META[stakingProgramId]?.deprecated) {
      return acc;
    }

    // otherwise, append to the end
    return [...acc, stakingProgramId];
  }, []);

  const otherStakingProgramIds = orderedStakingProgramIds.filter(
    (stakingProgramId) => {
      const info = STAKING_PROGRAM_META[stakingProgramId];
      if (!info) return false;
      if (activeStakingProgramId === stakingProgramId) return false;
      if (info.deprecated) return false;
      return true;
    },
  );

  return (
    <Card
      title={<CardTitle title="Manage staking contract" />}
      bordered={false}
      styles={{
        body: {
          paddingTop: 0,
          paddingBottom: 0,
        },
      }}
      extra={
        <Button
          size="large"
          icon={<CloseOutlined />}
          onClick={() => goto(Pages.Main)}
        />
      }
    >
      <WhatAreStakingContractsSection />

      {activeStakingProgramId && (
        <StakingContractSection
          stakingProgramId={orderedStakingProgramIds[0]}
        />
      )}

      <CardSection
        style={{
          padding: 24,
        }}
        borderbottom="true"
        vertical
        gap={16}
      >
        {`Browse ${otherStakingProgramIds.length} staking contract${otherStakingProgramIds.length > 1 ? 's' : ''}.`}
      </CardSection>

      {otherStakingProgramIds.map((stakingProgramId) => (
        <StakingContractSection
          key={stakingProgramId}
          stakingProgramId={stakingProgramId}
        />
      ))}
    </Card>
  );
};
