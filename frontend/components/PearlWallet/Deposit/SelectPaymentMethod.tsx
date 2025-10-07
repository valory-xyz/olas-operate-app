import { Button, Flex, Image, Typography } from 'antd';
import { styled } from 'styled-components';

import { BackButton, CardFlex, CardTitle } from '@/components/ui';
import {
  COLOR,
  EvmChainId,
  TokenSymbol,
  TokenSymbolConfigMap,
} from '@/constants';
import { assertRequired } from '@/types/Util';
import { asEvmChainDetails, asMiddlewareChain } from '@/utils';

import { usePearlWallet } from '../PearlWalletProvider';

const { Title, Text, Paragraph } = Typography;

const PaymentMethodCard = styled(CardFlex)`
  width: 360px;
  border-color: ${COLOR.WHITE};

  .ant-card-body {
    height: 100%;
  }
`;

const YouWillPayContainer = styled(Flex)`
  background: ${COLOR.BACKGROUND};
  border-radius: 10px;
  padding: 12px 16px;
`;

const Transfer = ({ chainId }: { chainId: EvmChainId }) => {
  const chainName = asEvmChainDetails(asMiddlewareChain(chainId)).displayName;
  const { amountsToDeposit } = usePearlWallet();

  return (
    <PaymentMethodCard>
      <Flex vertical gap={32}>
        <Flex vertical gap={16}>
          <CardTitle className="m-0">Buy</CardTitle>
          <Paragraph type="secondary" className="m-0 text-center">
            Pay in fiat by using your credit or debit card — perfect for speed
            and ease!
          </Paragraph>
        </Flex>

        <Flex vertical gap={8}>
          <Paragraph className="m-0" type="secondary">
            You will pay
          </Paragraph>
          <YouWillPayContainer vertical gap={12}>
            <Flex vertical gap={12}>
              {Object.entries(amountsToDeposit).map(([tokenSymbol, amount]) => (
                <Flex key={tokenSymbol} gap={8} align="center">
                  <Image
                    src={TokenSymbolConfigMap[tokenSymbol as TokenSymbol].image}
                    alt={tokenSymbol}
                    width={20}
                    className="flex"
                  />
                  <Flex gap={8} align="center">
                    <Text>
                      {amount.toFixed(4)} {tokenSymbol}
                    </Text>
                  </Flex>
                </Flex>
              ))}
            </Flex>
            <Text className="text-sm text-neutral-tertiary" type="secondary">
              + transaction fees on {chainName}.
            </Text>
          </YouWillPayContainer>
        </Flex>

        <Button
          // type="primary"
          size="large"
          // onClick={() => goto(SetupScreen.SetupOnRamp)}
          // disabled={isLoading}
        >
          Transfer Crypto on {chainName}
        </Button>
      </Flex>
    </PaymentMethodCard>
  );
};

const Bridge = () => (
  <PaymentMethodCard>
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
        <YouWillPayContainer>
          <Text className="text-sm text-neutral-tertiary" type="secondary">
            + bridging fees on Ethereum.
          </Text>
        </YouWillPayContainer>
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
  </PaymentMethodCard>
);

export const SelectPaymentMethod = ({ onBack }: { onBack: () => void }) => {
  const { walletChainId } = usePearlWallet();

  assertRequired(
    walletChainId,
    'Chain ID is required to select payment method',
  );

  return (
    <Flex vertical align="center" className="w-full px-16">
      <BackButton onPrev={onBack} />
      <Title level={4} className="mt-12 mb-32">
        Select Payment Method
      </Title>

      <Flex gap={24}>
        <Transfer chainId={walletChainId} />
        <Bridge />
      </Flex>
    </Flex>
  );
};
