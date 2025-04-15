import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Flex, Form, Image, Typography } from 'antd';
import { useMemo } from 'react';

import { Pages } from '@/enums/Pages';
import { TokenSymbol } from '@/enums/Token';
import { usePageState } from '@/hooks/usePageState';
import { toMiddlewareChainFromTokenSymbol } from '@/utils/middlewareHelpers';

import { NumberInput } from '../NumberInput';
import { CardFlex } from '../styled/CardFlex';

const { Title, Text } = Typography;

// TODO: from backend
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

const BridgeHeader = () => {
  const { goto } = usePageState();

  return (
    <Flex gap={16} align="center">
      <Button onClick={() => goto(Pages.Main)} icon={<ArrowLeftOutlined />} />
      <Title level={5} className="m-0">
        Bridge from Ethereum
      </Title>
    </Flex>
  );
};

const InputAddOn = ({ symbol }: { symbol: TokenSymbol }) => {
  const imgSrc = useMemo(() => {
    if (!symbol) return;
    if (symbol === TokenSymbol.OLAS) {
      return '/olas-icon.png';
    }
    return `/chains/${toMiddlewareChainFromTokenSymbol(symbol)}-chain.png`;
  }, [symbol]);

  return (
    <Flex align="center" justify="flex-start" gap={6} style={{ width: 78 }}>
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
  );
};

export const AddFundsThroughBridge = () => {
  const { goto } = usePageState();

  return (
    <CardFlex
      gap={20}
      noBorder
      title={<BridgeHeader />}
      styles={{ header: { minHeight: 56 }, body: { padding: '0 24px' } }}
    >
      <Text>
        Specify the amount of tokens you&apos;d like to receive to your Pearl
        Safe.
      </Text>

      <Flex gap={8} vertical>
        <Text className="font-xs" type="secondary">
          Amount to receive
        </Text>
        <Flex gap={12} vertical>
          <Form
            layout="vertical"
            onFinish={(values) => {
              console.log('Form Values:', values);
            }}
          >
            {fundsToReceive.map(({ symbol, amount }) => {
              return (
                <Form.Item
                  key={symbol}
                  name={symbol}
                  label={null}
                  initialValue={amount}
                  rules={[
                    {
                      required: true,
                      message: '',
                    },
                    {
                      type: 'number',
                      min: 0,
                      message: '',
                    },
                  ]}
                  validateTrigger="onSubmit"
                >
                  <NumberInput
                    addonBefore={<InputAddOn symbol={symbol} />}
                    placeholder="0.00"
                    size="large"
                    min={0}
                    className="w-full"
                  />
                </Form.Item>
              );
            })}

            <Form.Item>
              <Button type="primary" size="large" htmlType="submit" block>
                Bridge funds
              </Button>
            </Form.Item>
          </Form>
        </Flex>
      </Flex>
    </CardFlex>
  );
};
