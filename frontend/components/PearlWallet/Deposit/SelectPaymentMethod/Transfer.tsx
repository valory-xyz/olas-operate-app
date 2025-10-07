import { Button, Flex, Image, Typography } from 'antd';

import { CardTitle } from '@/components/ui';
import { TokenSymbol, TokenSymbolConfigMap } from '@/constants';
import { assertRequired } from '@/types/Util';
import { asEvmChainDetails, asMiddlewareChain } from '@/utils';

import { usePearlWallet } from '../../PearlWalletProvider';
import { SelectPaymentMethodCard, YouPayContainer } from './common';

const { Title, Text, Paragraph } = Typography;

export const Transfer = ({ onSelect }: { onSelect: () => void }) => {
  const { walletChainId: chainId } = usePearlWallet();
  const { amountsToDeposit } = usePearlWallet();

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
          </YouPayContainer>
        </Flex>

        <Button
          onClick={onSelect}
          // type="primary"
          size="large"
          // disabled={isLoading}
        >
          Transfer Crypto on {chainName}
        </Button>
      </Flex>
    </SelectPaymentMethodCard>
  );
};
