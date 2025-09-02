import { Card, Collapse, Flex, Typography } from 'antd';
import { useMemo } from 'react';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useServices } from '@/hooks/useServices';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { CardTitle } from '../Card/CardTitle';
import { GoToMainPageButton } from '../Pages/GoToMainPageButton';
import { CardSection } from '../styled/CardSection';
import { StakingContractSection } from './StakingContractSection';

const { Text } = Typography;

const collapseItems = [
  {
    key: 1,
    label: <Text className="font-weight-600">What are staking contracts?</Text>,
    children: (
      <Flex vertical gap={12}>
        <Text>
          When your agent goes to work, it participates in staking contracts.
        </Text>
        <Text>
          Staking contracts define what the agent needs to do, how much OLAS
          needs to be staked, etc., to be eligible for rewards.
        </Text>
        <Text>
          Your agent can only participate in one staking contract at a time.
        </Text>
      </Flex>
    ),
  },
];

const WhatAreStakingContractsSection = () => {
  return (
    <CardSection
      borderbottom="true"
      justify="space-between"
      align="center"
      padding="0"
    >
      <Collapse items={collapseItems} ghost />
    </CardSection>
  );
};

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
        style={{ padding: 24 }}
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
