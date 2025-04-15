import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Flex, Image, Typography } from 'antd';

import { Pages } from '@/enums/Pages';
import { TokenSymbol } from '@/enums/Token';
import { usePageState } from '@/hooks/usePageState';
import { toMiddlewareChainFromTokenSymbol } from '@/utils/middlewareHelpers';

import { NumberInput } from '../NumberInput';
import { CardFlex } from '../styled/CardFlex';

const { Title, Text } = Typography;

const fundsToReceive = [
  {
    symbol: TokenSymbol.OLAS,
    amount: 0,
  },
  {
    symbol: TokenSymbol.ETH,
    amount: 0.005,
  },
];

export const AddFundsThroughBridge = () => {
  const { goto } = usePageState();

  return (
    <CardFlex
      gap={20}
      noBorder
      styles={{
        header: { minHeight: 56 },
        body: { padding: '0 24px' },
      }}
      title={
        <Flex gap={16} align="center">
          <Button
            onClick={() => goto(Pages.Main)}
            icon={<ArrowLeftOutlined />}
          />
          <Title level={5} className="m-0">
            Bridge from Ethereum
          </Title>
        </Flex>
      }
    >
      <Text>
        Specify the amount of tokens you&apos;d like to receive to your Pearl
        Safe.
      </Text>

      <Flex gap={12} vertical>
        <Text className="font-xs" type="secondary">
          Amount to receive
        </Text>
        {fundsToReceive.map(({ symbol, amount }) => {
          const imgSrc = (() => {
            if (!symbol) return;
            if (symbol === TokenSymbol.OLAS) {
              return '/olas-icon.png';
            }
            return `/chains/${toMiddlewareChainFromTokenSymbol(symbol)}-chain.png`;
          })();

          return (
            <NumberInput
              key={symbol}
              value={amount}
              addonBefore={
                <Flex
                  align="center"
                  justify="flex-start"
                  gap={6}
                  style={{ width: 78 }}
                >
                  {imgSrc && (
                    <>
                      <Image
                        src={imgSrc}
                        alt={symbol}
                        style={{ width: 20, height: 20 }}
                        preview={false}
                      />{' '}
                    </>
                  )}

                  {symbol}
                </Flex>
              }
              placeholder="0.00"
              size="large"
              min={0}
            />
          );
        })}

        <Button
          type="primary"
          size="large"
          onClick={() => goto(Pages.Main)}
          disabled // TODO: Mohan to update
        >
          Bridge funds
        </Button>
      </Flex>
    </CardFlex>
  );
};
