import { Button, Flex, Typography } from 'antd';
import { entries } from 'lodash';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { styled } from 'styled-components';

import { YouPayContainer } from '@/components/PearlWallet';
import { BackButton, CardFlex, CardTitle } from '@/components/ui';
import { TokenSymbol, TokenSymbolConfigMap } from '@/config/tokens';
import { COLOR, EvmChainId } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { useFeatureFlag } from '@/hooks';
import { asEvmChainDetails, asMiddlewareChain, formatNumber } from '@/utils';

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

type ShowAmountsToDepositProps = { amountPrefix?: string };
const ShowAmountsToDeposit = ({
  amountPrefix = '',
}: ShowAmountsToDepositProps) => {
  const { amountsToDeposit } = usePearlWallet();
  return (
    <Flex vertical gap={12}>
      {entries(amountsToDeposit)
        .filter(([, { amount }]) => Number(amount) > 0)
        .map(([tokenSymbol, { amount }]) => (
          <Flex key={tokenSymbol} gap={8} align="center">
            <Image
              src={TokenSymbolConfigMap[tokenSymbol as TokenSymbol].image}
              alt={tokenSymbol}
              width={20}
              height={20}
            />
            <Flex gap={8} align="center">
              <Text>
                {amountPrefix}
                {formatNumber(amount, 4)} {tokenSymbol}
              </Text>
            </Flex>
          </Flex>
        ))}
    </Flex>
  );
};

type TransferMethodProps = { chainId: EvmChainId; onSelect: () => void };
const TransferMethod = ({ chainId, onSelect }: TransferMethodProps) => {
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
          Estimated to pay
        </Paragraph>
        <YouPayContainer vertical gap={12}>
          <ShowAmountsToDeposit amountPrefix="~" />
          <Text className="text-sm text-neutral-tertiary" type="secondary">
            Final amount may be higher due to Ethereum bridge fees and slippage.
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
  const { walletChainId: chainId, amountsToDeposit } = usePearlWallet();
  const [isBridgingEnabled] = useFeatureFlag(['bridge-onboarding']);
  const [paymentMethod, setPaymentMethod] = useState<
    'TRANSFER' | 'BRIDGE' | null
  >(null);

  const onPaymentMethodBack = useCallback(() => setPaymentMethod(null), []);

  // If no chain is selected, we cannot proceed.
  if (!chainId) return null;

  const chainName = asEvmChainDetails(asMiddlewareChain(chainId)).displayName;

  if (paymentMethod === 'TRANSFER') {
    return <TransferCryptoOn chainName={chainName} onBack={onBack} />;
  }

  if (paymentMethod === 'BRIDGE') {
    return (
      <BridgeCryptoOn
        amountsToDeposit={amountsToDeposit}
        bridgeToChain={asMiddlewareChain(chainId)}
        onBack={onPaymentMethodBack}
      />
    );
  }

  return (
    <Flex vertical align="center" className="w-full px-16">
      <BackButton onPrev={onBack} />
      <Title level={4} className="mt-12 mb-32">
        Select Payment Method
      </Title>

      <Flex gap={24}>
        <TransferMethod
          chainId={chainId}
          onSelect={() => setPaymentMethod('TRANSFER')}
        />
        {isBridgingEnabled && (
          <BridgeMethod onSelect={() => setPaymentMethod('BRIDGE')} />
        )}
      </Flex>
    </Flex>
  );
};
