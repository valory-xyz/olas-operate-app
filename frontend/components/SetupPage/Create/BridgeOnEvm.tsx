import { Button, Typography } from 'antd';
import { useCallback } from 'react';

import { CardFlex } from '@/components/styled/CardFlex';
import { CardSection } from '@/components/styled/CardSection';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';

import { SetupCreateHeader } from './SetupCreateHeader';

const { Text, Title } = Typography;

// TODO: update
export const BridgeOnEvm = () => {
  const { goto } = useSetup();

  // TODO: remove
  const handleMove = useCallback(() => {
    goto(SetupScreen.BridgeInProgress);
  }, [goto]);

  return (
    <CardFlex noBorder>
      <SetupCreateHeader prev={SetupScreen.SetupEoaFunding} />

      <CardSection vertical gap={16} className="m-0 pt-24">
        <Title level={3} className="m-0">
          Bridge from Ethereum
        </Title>
        <Text className="text-base">
          The bridged amount covers all funds required to create your account
          and run your agent, including fees. No further funds will be needed.
        </Text>
        <Button onClick={handleMove} block type="primary" size="large">
          {'TODO => next'}
        </Button>
      </CardSection>
    </CardFlex>
  );
};
