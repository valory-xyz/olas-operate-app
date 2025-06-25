import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Flex, Image, Typography } from 'antd';
import { isNil } from 'lodash';
import { useCallback, useMemo, useState } from 'react';

import { Pages } from '@/enums/Pages';
import { TokenSymbol } from '@/enums/Token';
import { usePageState } from '@/hooks/usePageState';
import { toMiddlewareChainFromTokenSymbol } from '@/utils/middlewareHelpers';

import { useGenerateInputsToAddFundsToMasterSafe } from '../AddFundsToMasterSafe/useGenerateInputsToAddFundsToMasterSafe';
import { NumberInput } from '../NumberInput';
import { CardFlex } from '../styled/CardFlex';

const { Title, Text } = Typography;

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
    if (symbol === TokenSymbol.OLAS) return '/olas-icon.png';
    return `/chains/${toMiddlewareChainFromTokenSymbol(symbol)}-chain.png`;
  }, [symbol]);

  return (
    <Flex align="center" justify="flex-start" gap={6} style={{ width: 78 }}>
      {imgSrc && (
        <Image
          src={imgSrc}
          alt={symbol}
          style={{ width: 20, height: 20, marginRight: 6 }}
          preview={false}
        />
      )}

      {symbol}
    </Flex>
  );
};

export const AddFundsThroughBridge = () => {
  // const { goto } = usePageState();
  const amountsToReceive = useGenerateInputsToAddFundsToMasterSafe();

  const [inputs, setInputs] = useState(
    amountsToReceive.reduce(
      (acc, { symbol, amount }) => ({ ...acc, [symbol]: amount }),
      {} as Record<TokenSymbol, number | null>,
    ),
  );

  const handleInputChange = useCallback(
    (symbol: TokenSymbol, value: number | null) => {
      setInputs((prev) => ({ ...prev, [symbol]: value }));
    },
    [],
  );

  const handleBridgeFunds = useCallback(() => {
    const amountsToBridge = amountsToReceive
      .map((tokenDetails) => {
        const amount = inputs[tokenDetails.symbol];
        if (!amount) return null;
        return { ...tokenDetails, amount };
      })
      .filter((item) => item !== null);
    window.console.log('Bridging funds:', amountsToBridge);
    // goto(Pages.Main); // REMOVE and move to the next screen
  }, [inputs, amountsToReceive]);

  const isButtonDisabled = useMemo(() => {
    return Object.values(inputs).every((value) => isNil(value) || value <= 0);
  }, [inputs]);

  return (
    <CardFlex
      $gap={20}
      $noBorder
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
        <Flex gap={16} vertical>
          {amountsToReceive.map(({ symbol }) => {
            return (
              <NumberInput
                key={symbol}
                value={inputs[symbol]}
                addonBefore={<InputAddOn symbol={symbol} />}
                placeholder="0.00"
                size="large"
                min={0}
                onChange={(value: number | null) => {
                  handleInputChange(symbol, value);
                }}
              />
            );
          })}

          <Button
            disabled={isButtonDisabled}
            onClick={handleBridgeFunds}
            type="primary"
            size="large"
          >
            Bridge funds
          </Button>
        </Flex>
      </Flex>
    </CardFlex>
  );
};
