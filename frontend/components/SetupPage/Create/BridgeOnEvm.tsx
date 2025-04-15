import { Button, Typography } from 'antd';
import { useCallback } from 'react';

import { DepositForBridging } from '@/components/bridge/DepositForBridging';
import { CardFlex } from '@/components/styled/CardFlex';
import { CardSection } from '@/components/styled/CardSection';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';

import { SetupCreateHeader } from './SetupCreateHeader';

const { Text, Title } = Typography;

const FROM_CHAIN_NAME = 'Ethereum';

// TODO: Tanya to update the component
export const BridgeOnEvm = () => {
  const { goto } = useSetup();

  // TODO: dummy function to move to the next screen (for Mohan to work on "in progress" screen)
  const handleMove = useCallback(() => {
    goto(SetupScreen.BridgeInProgress);
  }, [goto]);

  return (
    <CardFlex $noBorder>
      <SetupCreateHeader prev={SetupScreen.SetupEoaFunding} />

      <CardSection vertical gap={16} className="m-0 pt-24">
        <Title level={3} className="m-0">
          Bridge from {FROM_CHAIN_NAME}
        </Title>
        <Text className="text-base">
          The bridged amount covers all funds required to create your account
          and run your agent, including fees. No further funds will be needed.
        </Text>
        <DepositForBridging chainName={FROM_CHAIN_NAME} />
        <Button onClick={handleMove} block type="primary" size="large">
          {'TODO => next'}
        </Button>
      </CardSection>
    </CardFlex>
  );
};
