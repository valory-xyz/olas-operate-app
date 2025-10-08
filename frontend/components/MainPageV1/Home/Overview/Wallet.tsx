import { Button, Flex, Image, Typography } from 'antd';
import styled from 'styled-components';

import { CardFlex } from '@/components/ui/CardFlex';
import { COLOR, NA, TokenSymbolConfigMap, TokenSymbolMap } from '@/constants';
import { Pages } from '@/enums/Pages';
import { useSharedContext } from '@/hooks';
import { useAvailableAgentAssets } from '@/hooks/useAvailableAgentAssets';
import { usePageState } from '@/hooks/usePageState';

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
  const { isMainOlasBalanceLoading } = useSharedContext();
  const { goto } = usePageState();
  const availableAssets = useAvailableAgentAssets();
  const availableAssetsExceptOlas = availableAssets.filter(
    ({ symbol, amount }) => symbol !== TokenSymbolMap.OLAS && amount > 0,
  );

  return (
    <Flex vertical>
      <Flex justify="space-between" align="center">
        <Title level={5} className="mt-0 mb-12">
          Wallet
        </Title>
        <Button
          disabled={isMainOlasBalanceLoading}
          onClick={() => goto(Pages.AgentWallet)}
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
                          alt={symbol}
                          width={20}
                          className="flex"
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
