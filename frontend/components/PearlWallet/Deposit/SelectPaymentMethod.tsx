import { Button, Flex, Typography } from 'antd';
import { styled } from 'styled-components';

import { BackButton, CardFlex, CardTitle } from '@/components/ui';
import { COLOR } from '@/constants';

const { Title, Text, Paragraph } = Typography;

const PaymentMethodCard = styled(CardFlex)`
  width: 360px;
  border-color: ${COLOR.WHITE};

  .ant-card-body {
    height: 100%;
  }

  /* .fund-method-card-body {
    flex: 1;
  } */
`;

const YouWillPayContainer = styled(Flex)`
  background: ${COLOR.BACKGROUND};
  border-radius: 10px;
  padding: 12px 16px;
`;

const CardDescription = ({ children }: { children: React.ReactNode }) => (
  <Paragraph
    type="secondary"
    className="text-center"
    style={{ minHeight: '4.5rem' }}
  >
    {children}
  </Paragraph>
);

const Transfer = () => (
  <PaymentMethodCard>
    <Flex vertical gap={32}>
      <Flex vertical gap={16}>
        <CardTitle className="m-0">Buy</CardTitle>
        <Paragraph type="secondary" className="m-0 text-center">
          Pay in fiat by using your credit or debit card — perfect for speed and
          ease!
        </Paragraph>
      </Flex>

      <Flex vertical gap={8}>
        <Paragraph className="m-0" type="secondary">
          You will pay
        </Paragraph>
        <YouWillPayContainer>
          <Text className="text-sm text-neutral-tertiary" type="secondary">
            + transaction fees on Optimism.
          </Text>
        </YouWillPayContainer>
      </Flex>

      <Button
        // type="primary"
        size="large"
        // onClick={() => goto(SetupScreen.SetupOnRamp)}
        // disabled={isLoading}
      >
        Transfer Crypto on Optimism
      </Button>
    </Flex>
  </PaymentMethodCard>
);

const Bridge = () => (
  <PaymentMethodCard>
    <div className="fund-method-card-body">
      <CardTitle>Bridge</CardTitle>
      <CardDescription>
        Bridge from Ethereum Mainnet. Slightly more expensive.
      </CardDescription>
      <div />
    </div>
  </PaymentMethodCard>
);

export const SelectPaymentMethod = ({ onBack }: { onBack: () => void }) => {
  return (
    <Flex vertical style={{ width: '100%' }} align="center">
      <BackButton onPrev={onBack} />
      <Title level={4} className="mt-12 mb-32">
        Select Payment Method
      </Title>

      <Flex gap={24}>
        <Transfer />
        <Bridge />
      </Flex>
    </Flex>
  );
};
