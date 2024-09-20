import { Collapse, Flex, Typography } from 'antd';

import { CardSection } from '../styled/CardSection';

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
        <Text>
          To be eligible for rewards your agent must run max 1 hour a day,
          regardless of the staking contract.
        </Text>
      </Flex>
    ),
  },
];

export const WhatAreStakingContractsSection = () => {
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
