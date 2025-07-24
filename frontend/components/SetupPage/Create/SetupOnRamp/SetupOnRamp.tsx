import { Flex, Spin, Typography } from 'antd';
import { useCallback } from 'react';

import { CustomAlert } from '@/components/Alert';
import { CardFlex } from '@/components/styled/CardFlex';
import { CardSection } from '@/components/styled/CardSection';
import { AgentHeader } from '@/components/ui/AgentHeader';
import { SetupScreen } from '@/enums/SetupScreen';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useSetup } from '@/hooks/useSetup';

import { OnRampPaymentSteps } from './OnRampPaymentSteps/OnRampPaymentSteps';
import { PayingReceivingTable } from './PayingReceivingTable/PayingReceivingTable';

const { Title, Text } = Typography;

const Loader = () => (
  <Flex justify="center" align="center" style={{ height: 120 }}>
    <Spin />
  </Flex>
);

const PayInFiatHeader = () => (
  <Flex vertical gap={8}>
    <Title level={3} className="m-0">
      Pay in fiat
    </Title>
    <Text className="text-base text-lighter">
      The amount you pay in fiat covers all funds required to create an account
      and run your agent, including fees. No further funds will be needed.
    </Text>
  </Flex>
);

const KeepOpenAlert = () => (
  <CardSection>
    <CustomAlert
      fullWidth
      type="warning"
      showIcon
      message={
        <Flex vertical gap={5}>
          <Text className="text-sm">
            Keep the app open until the process is complete.
          </Text>
        </Flex>
      }
    />
  </CardSection>
);

export const SetupOnRamp = () => {
  const { goto: gotoSetup } = useSetup();
  const { networkId } = useOnRampContext();

  const handlePrevStep = useCallback(() => {
    gotoSetup(SetupScreen.SetupEoaFunding);
  }, [gotoSetup]);

  return (
    <CardFlex $noBorder>
      <AgentHeader onPrev={handlePrevStep} />
      <CardSection vertical gap={24} className="m-0 pt-24">
        <PayInFiatHeader />
        <KeepOpenAlert />

        {networkId ? (
          <Flex vertical gap={24}>
            <PayingReceivingTable onRampChainId={networkId} />
            <OnRampPaymentSteps onRampChainId={networkId} />
          </Flex>
        ) : (
          <Loader />
        )}
      </CardSection>
    </CardFlex>
  );
};
