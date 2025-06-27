import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { isNil } from 'lodash';
import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';

import { Pages } from '@/enums/Pages';
import { TokenSymbol } from '@/enums/Token';
import { usePageState } from '@/hooks/usePageState';
import { BridgeRefillRequirementsRequest, BridgeRequest } from '@/types/Bridge';
import { toMiddlewareChainFromTokenSymbol } from '@/utils/middlewareHelpers';

import { Bridge } from '../Bridge/Bridge';
import { NumberInput } from '../NumberInput';
import { CardFlex } from '../styled/CardFlex';
import {
  GeneratedInput,
  useGenerateInputsToAddFundsToMasterSafe,
} from './useGenerateInputsToAddFundsToMasterSafe';
import { useGetBridgeRequirementsParams } from './useGetBridgeRequirementsParams';

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
    <Flex align="center" justify="flex-start" gap={8} style={{ width: 78 }}>
      {imgSrc && <Image src={imgSrc} alt={symbol} width={20} height={20} />}
      {symbol}
    </Flex>
  );
};

type AddFundsInputProps = {
  onBridgeFunds: (bridgeRequirements: BridgeRequest[]) => void;
};

const AddFundsInput = ({ onBridgeFunds }: AddFundsInputProps) => {
  const amountsToReceive = useGenerateInputsToAddFundsToMasterSafe();
  const getBridgeRequirementsParams = useGetBridgeRequirementsParams();

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

  // covert user input to bridge requirements for bridging.
  const handleBridgeFunds = useCallback(() => {
    const amountsToBridge = amountsToReceive
      .map((tokenDetails) => {
        const amount = inputs[tokenDetails.symbol];
        if (!amount) return null;
        return { ...tokenDetails, amount };
      })
      .filter((item): item is GeneratedInput => !!item);

    const bridgeRequirementsParams: BridgeRequest[] = amountsToBridge.map(
      ({ tokenAddress, amount }) =>
        getBridgeRequirementsParams(tokenAddress, amount),
    );

    return onBridgeFunds(bridgeRequirementsParams);
  }, [inputs, amountsToReceive, getBridgeRequirementsParams, onBridgeFunds]);

  // If all inputs are empty or zero, disable the button
  const isButtonDisabled = useMemo(() => {
    return Object.values(inputs).every((value) => isNil(value) || value <= 0);
  }, [inputs]);

  return (
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
              onChange={(value: number | null) =>
                handleInputChange(symbol, value)
              }
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
  );
};

/**
 * Add funds to the master safe through a bridge
 * by specifying the amount to receive.
 */
export const AddFundsThroughBridge = () => {
  const [bridgeState, setBridgeState] = useState<
    BridgeRefillRequirementsRequest | undefined
  >();
  const [addFundsState, setAddFundsState] = useState<'funding' | 'bridging'>(
    'funding',
  );

  const handleBridgeFunds = useCallback(
    (bridgeRequirements: BridgeRequest[]) => {
      const requirements: BridgeRefillRequirementsRequest = {
        bridge_requests: bridgeRequirements,
        force_update: false,
      };

      setBridgeState(requirements);
      setAddFundsState('bridging');
    },
    [setBridgeState, setAddFundsState],
  );

  const handleGetBridgeRequirementsParams = useCallback(() => {
    if (!bridgeState) throw new Error('Bridge requirements are not set.');
    return bridgeState;
  }, [bridgeState]);

  const handlePrevStep = useCallback(() => {
    setAddFundsState('funding');
  }, []);

  switch (addFundsState) {
    case 'funding':
      return (
        <CardFlex
          $gap={20}
          $noBorder
          title={<BridgeHeader />}
          styles={{ header: { minHeight: 56 }, body: { padding: '0 24px' } }}
        >
          <Text>
            Specify the amount of tokens you&apos;d like to receive to your
            Pearl Safe.
          </Text>

          <AddFundsInput onBridgeFunds={handleBridgeFunds} />
        </CardFlex>
      );
    case 'bridging':
      return (
        <Bridge
          bridgeFromDescription="Bridging amount includes fees."
          showCompleteScreen={{
            completionMessage: 'Funds have been bridged to your Pearl Safe.',
          }}
          getBridgeRequirementsParams={handleGetBridgeRequirementsParams}
          onPrevBeforeBridging={handlePrevStep}
        />
      );
    default:
      throw new Error('Invalid add funds state');
  }
};
