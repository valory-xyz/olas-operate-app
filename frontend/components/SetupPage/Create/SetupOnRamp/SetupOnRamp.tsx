import { Flex, Spin, Typography } from 'antd';
import { useCallback } from 'react';

import { CustomAlert } from '@/components/Alert';
import { CardFlex } from '@/components/styled/CardFlex';
import { BackButton } from '@/components/ui/BackButton';
import { SetupScreen } from '@/enums/SetupScreen';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useSetup } from '@/hooks/useSetup';

import { OnRampPaymentSteps } from './OnRampPaymentSteps/OnRampPaymentSteps';
import { PayingReceivingTable } from './PayingReceivingTable/PayingReceivingTable';

const { Text, Title } = Typography;

const Loader = () => (
  <Flex
    justify="center"
    align="center"
    className="mt-32"
    style={{ height: 120 }}
  >
    <Spin />
  </Flex>
);

const KeepOpenAlert = () => (
  <CustomAlert
    type="warning"
    showIcon
    message="Keep the app open until the process is complete."
  />
);

export const SetupOnRamp = () => {
  const { goto: gotoSetup, prevState } = useSetup();
  const { networkId } = useOnRampContext();

  const handlePrevStep = useCallback(() => {
    gotoSetup(prevState ?? SetupScreen.FundYourAgent);
  }, [gotoSetup, prevState]);

  return (
    <Flex justify="center" className="pt-48">
      <CardFlex $noBorder $onboarding className="p-8">
        <BackButton onPrev={handlePrevStep} />
        <Title level={3} className="mt-16">
          Buy Crypto with USD
        </Title>
        <Text type="secondary" className="mb-24">
          Use your credit or debit card to buy crypto effortlessly - powered by
          Transak.
        </Text>

        <KeepOpenAlert />

        {networkId ? (
          <Flex vertical gap={24} className="mt-32">
            <PayingReceivingTable onRampChainId={networkId} />
            <OnRampPaymentSteps onRampChainId={networkId} />
          </Flex>
        ) : (
          <Loader />
        )}
      </CardFlex>
    </Flex>
  );
};
