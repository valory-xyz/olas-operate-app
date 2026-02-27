import { Button, Flex, Typography } from 'antd';
import Image from 'next/image';
import styled from 'styled-components';

import { CardFlex } from '@/components/ui';
import { TokenSymbolConfigMap, TokenSymbolMap } from '@/config/tokens';
import { COLOR, NA, PAGES } from '@/constants';
import { useAvailableAgentAssets, usePageState } from '@/hooks';

const { Text, Title } = Typography;

const TokenWrapper = styled(Flex)`
  display: inline-flex;
  width: fit-content;
  padding: 4px 10px 4px 6px;
  border-radius: 8px;
  border: 1px solid ${COLOR.GRAY_3};
`;

/**
 * To display wallet overview on the main page.
 */
export const Wallet = () => {
  const { goto } = usePageState();
  const { availableAssets, isLoading } = useAvailableAgentAssets();
  const availableAssetsExceptOlas = availableAssets.filter(
    ({ symbol }) => symbol !== TokenSymbolMap.OLAS,
  );

  return (
    <Flex vertical gap={12}>
      <Flex justify="space-between" align="center">
        <Title level={5} className="m-0">
          Wallet
        </Title>
        <Button
          disabled={isLoading}
          onClick={() => goto(PAGES.AgentWallet)}
          size="small"
        >
          Manage Wallet
        </Button>
      </Flex>

      <CardFlex $noBorder>
        <Flex vertical gap={24}>
          <Flex flex={1}>
            <Flex flex={1} vertical gap={8}>
              <Text className="text-neutral-secondary">Tokens</Text>
              <Flex gap={8}>
                {availableAssetsExceptOlas.length > 0
                  ? availableAssetsExceptOlas.map(({ symbol }) => (
                      <TokenWrapper key={symbol} gap={6} align="center">
                        <Image
                          src={TokenSymbolConfigMap[symbol].image}
                          alt={`${symbol} icon`}
                          width={20}
                          height={20}
                        />
                        <Text>{symbol}</Text>
                      </TokenWrapper>
                    ))
                  : NA}
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      </CardFlex>
    </Flex>
  );
};
