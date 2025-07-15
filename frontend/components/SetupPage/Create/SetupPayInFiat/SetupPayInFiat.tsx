import { Flex, Typography } from 'antd';
import { useCallback } from 'react';

import { CustomAlert } from '@/components/Alert';
import { CardFlex } from '@/components/styled/CardFlex';
import { CardSection } from '@/components/styled/CardSection';
import { AgentHeader } from '@/components/ui/AgentHeader';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';

import { FiatPaymentSteps } from './FiatPaymentSteps';
import { PayingReceivingTable } from './PayingReceivingTable';

const { Title, Text } = Typography;

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
  <CustomAlert
    fullWidth
    type="warning"
    showIcon
    message={
      <Flex vertical gap={5}>
        <Text>Keep the app open until the process is complete.</Text>
      </Flex>
    }
  />
);

export const SetupPayInFiat = () => {
  const { goto: gotoSetup } = useSetup();

  const handlePrevStep = useCallback(() => {
    gotoSetup(SetupScreen.SetupEoaFunding);
  }, [gotoSetup]);

  return (
    <CardFlex $noBorder>
      <AgentHeader onPrev={handlePrevStep} />

      <CardSection vertical gap={24} className="m-0 pt-24">
        <PayInFiatHeader />
        <CardSection>
          <KeepOpenAlert />
        </CardSection>

        <Flex>
          <PayingReceivingTable />
          <FiatPaymentSteps />
        </Flex>
      </CardSection>
    </CardFlex>
  );
};
