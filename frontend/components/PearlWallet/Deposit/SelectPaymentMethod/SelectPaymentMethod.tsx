import { Button, Flex, Image, Typography } from 'antd';
import { entries } from 'lodash';
import { useState } from 'react';
import { styled } from 'styled-components';

import { BackButton, CardFlex, CardTitle } from '@/components/ui';
import { COLOR, TokenSymbol, TokenSymbolConfigMap } from '@/constants';
import { assertRequired } from '@/types/Util';
import { asEvmChainDetails, asMiddlewareChain, formatNumber } from '@/utils';

import { usePearlWallet } from '../../PearlWalletProvider';
import { BridgeCryptoOn } from './BridgeCryptoOn';
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

const ShowAmountsToDeposit = () => {
  const { amountsToDeposit } = usePearlWallet();
  return (
    <Flex vertical gap={12}>
      {entries(amountsToDeposit).map(([tokenSymbol, amount]) => (
        <Flex key={tokenSymbol} gap={8} align="center">
          <Image
            src={TokenSymbolConfigMap[tokenSymbol as TokenSymbol].image}
            alt={tokenSymbol}
            width={20}
            className="flex"
          />
          <Flex gap={8} align="center">
            <Text>
              {formatNumber(amount, 4)} {tokenSymbol}
            </Text>
          </Flex>
        </Flex>
      ))}
    </Flex>
  );
};

const TransferMethod = ({ onSelect }: { onSelect: () => void }) => {
  const { walletChainId: chainId } = usePearlWallet();

  assertRequired(chainId, 'Chain ID is required');
  const chainName = asEvmChainDetails(asMiddlewareChain(chainId)).displayName;

  return (
    <SelectPaymentMethodCard>
      <Flex vertical gap={32}>
        <Flex vertical gap={16}>
          <CardTitle className="m-0">Transfer</CardTitle>
          <Paragraph type="secondary" className="m-0 text-center">
            Send funds directly with lowest fees — ideal for crypto-savvy users.
          </Paragraph>
        </Flex>

        <Flex vertical gap={8}>
          <Paragraph className="m-0" type="secondary">
            You will pay
          </Paragraph>
          <YouPayContainer vertical gap={12}>
            <ShowAmountsToDeposit />
            <Text className="text-sm text-neutral-tertiary" type="secondary">
              + transaction fees on {chainName}.
            </Text>
          </YouPayContainer>
        </Flex>

        <Button onClick={onSelect} size="large">
          Transfer Crypto on {chainName}
        </Button>
      </Flex>
    </SelectPaymentMethodCard>
  );
};

const BridgeMethod = ({ onSelect }: { onSelect: () => void }) => (
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
        <YouPayContainer vertical gap={12}>
          <ShowAmountsToDeposit />
          <Text className="text-sm text-neutral-tertiary" type="secondary">
            + bridging fees on Ethereum.
          </Text>
        </YouPayContainer>
      </Flex>

      <Button onClick={onSelect} size="large">
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
    return <BridgeCryptoOn onBack={() => setPaymentMethod(null)} />;
  }

  return (
    <Flex vertical align="center" className="w-full px-16">
      <BackButton onPrev={onBack} />
      <Title level={4} className="mt-12 mb-32">
        Select Payment Method
      </Title>

      <Flex gap={24}>
        <TransferMethod onSelect={() => setPaymentMethod('TRANSFER')} />
        <BridgeMethod onSelect={() => setPaymentMethod('BRIDGE')} />
      </Flex>
    </Flex>
  );
};
