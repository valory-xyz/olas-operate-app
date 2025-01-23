import { Card } from 'antd';
import { useMemo } from 'react';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useServices } from '@/hooks/useServices';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { CardTitle } from '../Card/CardTitle';
import { GoToMainPageButton } from '../Pages/GoToMainPageButton';
import { CardSection } from '../styled/CardSection';
import { StakingContractSection } from './StakingContractSection';
import { WhatAreStakingContractsSection } from './WhatAreStakingContracts';

export const ManageStakingPage = () => {
  const { selectedAgentConfig } = useServices();
  const {
    activeStakingProgramId,
    isActiveStakingProgramLoaded,
    defaultStakingProgramId,
  } = useStakingProgram();

  const currentStakingProgramId = isActiveStakingProgramLoaded
    ? activeStakingProgramId || defaultStakingProgramId
    : null;

  const stakingProgramIdsAvailable = Object.keys(
    STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId],
  ).map((stakingProgramIdKey) => stakingProgramIdKey as StakingProgramId);

  const orderedStakingProgramIds = useMemo(
    () =>
      stakingProgramIdsAvailable.reduce(
        (acc: StakingProgramId[], stakingProgramId: StakingProgramId) => {
          if (!isActiveStakingProgramLoaded) return acc;

          // put the active staking program at the top
          if (stakingProgramId === currentStakingProgramId) {
            return [stakingProgramId, ...acc];
          }

          // if the program is deprecated, ignore it
          if (
            STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][
              stakingProgramId
            ].deprecated
          ) {
            return acc;
          }

          // otherwise, append to the end
          return [...acc, stakingProgramId];
        },
        [],
      ),
    [
      isActiveStakingProgramLoaded,
      selectedAgentConfig.evmHomeChainId,
      currentStakingProgramId,
      stakingProgramIdsAvailable,
    ],
  );

  const otherStakingProgramIds = orderedStakingProgramIds.filter(
    (stakingProgramId) => {
      if (!isActiveStakingProgramLoaded) return false;

      const info =
        STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][stakingProgramId];

      if (!info) return false;
      if (currentStakingProgramId === stakingProgramId) return false;
      if (info.deprecated) return false;
      return true;
    },
  );

  const browseText = useMemo(() => {
    if (otherStakingProgramIds.length === 0)
      return 'No other staking contracts available at this time.';
    return `Browse ${otherStakingProgramIds.length} staking contract${otherStakingProgramIds.length === 1 ? '' : 's'}.`;
  }, [otherStakingProgramIds.length]);

  return (
    <Card
      title={<CardTitle title="Manage staking contract" />}
      bordered={false}
      styles={{ body: { paddingTop: 0, paddingBottom: 0 } }}
      extra={<GoToMainPageButton />}
    >
      <WhatAreStakingContractsSection />

      {isActiveStakingProgramLoaded &&
        (activeStakingProgramId || defaultStakingProgramId) && (
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
        {browseText}
      </CardSection>

      {otherStakingProgramIds.map((otherId) => (
        <StakingContractSection key={otherId} stakingProgramId={otherId} />
      ))}
    </Card>
  );
};
