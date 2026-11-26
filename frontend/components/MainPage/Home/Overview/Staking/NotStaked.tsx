import { Button, Flex, Typography } from 'antd';

import { CardFlex } from '@/components/ui';
import { PAGES } from '@/constants';
import { usePageState } from '@/hooks';

import { useCanManageStaking } from './Staking';

const { Text, Title } = Typography;

/** Staking section of an agent that may stake but is not staked. */
export const NotStaked = () => {
  const { goto } = usePageState();
  const canManageStaking = useCanManageStaking();

  return (
    <Flex vertical gap={12}>
      <Flex justify="space-between" align="center">
        <Title level={5} className="m-0">
          Staking
        </Title>
        {canManageStaking && (
          <Button size="small" onClick={() => goto(PAGES.SelectStaking)}>
            Manage Staking
          </Button>
        )}
      </Flex>

      <CardFlex $noBorder>
        <Flex vertical align="center">
          <Text className="text-neutral-secondary text-center">
            This agent isn&apos;t staked.
          </Text>
          <Text className="text-neutral-secondary text-center">
            Select a staking contract to become eligible for OLAS activity
            rewards.
          </Text>
        </Flex>
      </CardFlex>
    </Flex>
  );
};
