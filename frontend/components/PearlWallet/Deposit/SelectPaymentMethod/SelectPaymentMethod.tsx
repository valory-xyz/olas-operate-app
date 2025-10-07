import { Button, Flex, Typography } from 'antd';
import { useState } from 'react';
import { styled } from 'styled-components';

import { BackButton, CardFlex, CardTitle } from '@/components/ui';
import { COLOR } from '@/constants';
import { assertRequired } from '@/types/Util';
import { asEvmChainDetails, asMiddlewareChain } from '@/utils';

import { usePearlWallet } from '../../PearlWalletProvider';
import { Transfer } from './Transfer';
import { TransferCryptoOn } from './TransferCryptoOn';

const { Title, Text, Paragraph } = Typography;

const SelectPaymentMethodCard = styled(CardFlex)`
  width: 360px;
  border-color: ${COLOR.WHITE};

  .ant-card-body {
    height: 100%;
  }
`;

const YouPayContainer = styled(Flex)`
  background: ${COLOR.BACKGROUND};
  border-radius: 10px;
  padding: 12px 16px;
`;

const Bridge = () => (
  <SelectPaymentMethodCard>
    <Flex vertical gap={32}>
      <Flex vertical gap={16}>
        <CardTitle className="m-0">Bridge</CardTitle>
        <Paragraph type="secondary" className="m-0 text-center">
          Bridge from Ethereum Mainnet. Slightly more expensive.
        </Paragraph>
      </Flex>

      <Flex vertical gap={8}>
        <Paragraph className="m-0" type="secondary">
          You will pay
        </Paragraph>
        <YouPayContainer>
          <Text className="text-sm text-neutral-tertiary" type="secondary">
            + bridging fees on Ethereum.
          </Text>
        </YouPayContainer>
      </Flex>

      <Button
        // type="primary"
        size="large"
        // onClick={() => goto(SetupScreen.SetupOnRamp)}
        // disabled={isLoading}
      >
        Bridge Crypto from Ethereum
      </Button>
    </Flex>
  </SelectPaymentMethodCard>
);

export const SelectPaymentMethod = ({ onBack }: { onBack: () => void }) => {
  const { walletChainId: chainId } = usePearlWallet();
  assertRequired(chainId, 'Chain ID is required.');

  const chainName = asEvmChainDetails(asMiddlewareChain(chainId)).displayName;

  const [paymentMethod, setPaymentMethod] = useState<
    'TRANSFER' | 'BRIDGE' | null
  >(null);

  if (paymentMethod === 'TRANSFER') {
    return (
      <TransferCryptoOn
        onBack={() => setPaymentMethod(null)}
        chainName={chainName}
      />
    );
  }

  if (paymentMethod === 'BRIDGE') {
    return <Bridge />;
  }

  return (
    <Flex vertical align="center" className="w-full px-16">
      <BackButton onPrev={onBack} />
      <Title level={4} className="mt-12 mb-32">
        Select Payment Method
      </Title>

      <Flex gap={24}>
        <Transfer onSelect={() => setPaymentMethod('TRANSFER')} />
        <Bridge onSelect={() => setPaymentMethod('BRIDGE')} />
      </Flex>
    </Flex>
  );
};
