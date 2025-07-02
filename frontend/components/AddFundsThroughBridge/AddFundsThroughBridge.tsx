import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Flex, Spin, Typography } from 'antd';
import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';

import { AddressBalanceRecord } from '@/client';
import { Pages } from '@/enums/Pages';
import { TokenSymbol } from '@/enums/Token';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { usePageState } from '@/hooks/usePageState';
import { Address } from '@/types/Address';
import { BridgeRefillRequirementsRequest, BridgeRequest } from '@/types/Bridge';
import { toMiddlewareChainFromTokenSymbol } from '@/utils/middlewareHelpers';

import { Bridge } from '../Bridge/Bridge';
import { NumberInput } from '../NumberInput';
import { CardFlex } from '../styled/CardFlex';
import { DefaultTokenAmount } from './types';
import { useAddFundsInputs } from './useAddFundsInputs';

const { Title, Text } = Typography;

const Loader = () => (
  <Flex justify="center" align="center" style={{ height: 240 }}>
    <Spin />
  </Flex>
);

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
  /** Default token amounts to display in the input fields */
  defaultTokenAmounts?: DefaultTokenAmount[];
  /** Destination address to bridge funds to */
  destinationAddress?: Address;
  /** To bridge only the native token */
  onlyNativeToken?: boolean;
  requirements: AddressBalanceRecord;
  onBridgeFunds: (bridgeRequirements: BridgeRequest[]) => void;
};

const AddFundsInput = ({
  defaultTokenAmounts,
  requirements,
  onlyNativeToken,
  destinationAddress,
  onBridgeFunds,
}: AddFundsInputProps) => {
  const {
    onInputChange,
    inputsToDisplay,
    isInputEmpty,
    bridgeRequirementsParams,
  } = useAddFundsInputs({
    requirements,
    defaultTokenAmounts,
    destinationAddress,
    onlyNativeToken,
  });

  // covert user input to bridge requirements for bridging.
  const handleBridgeFunds = useCallback(
    () => onBridgeFunds(bridgeRequirementsParams),
    [onBridgeFunds, bridgeRequirementsParams],
  );

  return (
    <Flex gap={8} vertical>
      <Text className="font-xs" type="secondary">
        Amount to receive
      </Text>
      <Flex gap={16} vertical>
        {inputsToDisplay.map(({ symbol, amount }) => (
          <NumberInput
            key={symbol}
            value={amount}
            addonBefore={<InputAddOn symbol={symbol} />}
            placeholder="0.00"
            size="large"
            min={0}
            onChange={(value: number | null) => onInputChange(symbol, value)}
          />
        ))}

        <Button
          disabled={isInputEmpty}
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

type AddFundsThroughBridgeProps = Pick<
  AddFundsInputProps,
  'defaultTokenAmounts' | 'onlyNativeToken' | 'destinationAddress'
> & {
  completionMessage?: string;
};

/**
 * Add funds to the master safe through a bridge
 * by specifying the amount to receive.
 */
export const AddFundsThroughBridge = ({
  defaultTokenAmounts,
  destinationAddress,
  onlyNativeToken = false,
  completionMessage,
}: AddFundsThroughBridgeProps) => {
  const { isBalancesAndFundingRequirementsLoading, totalRequirements } =
    useBalanceAndRefillRequirementsContext();

  const [bridgeState, setBridgeState] = useState<
    BridgeRefillRequirementsRequest | undefined
  >();
  const [addFundsState, setAddFundsState] = useState<'funding' | 'bridging'>(
    'funding',
  );

  const showCompleteScreen = useMemo(() => {
    if (!completionMessage) return;
    return { completionMessage };
  }, [completionMessage]);

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

  const handleGetBridgeRequirementsParams = useCallback(
    (forceUpdate?: boolean): BridgeRefillRequirementsRequest => {
      if (!bridgeState) throw new Error('Bridge requirements are not set.');
      return { ...bridgeState, force_update: forceUpdate ?? false };
    },
    [bridgeState],
  );

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

          {isBalancesAndFundingRequirementsLoading ? (
            <Loader />
          ) : (
            <AddFundsInput
              defaultTokenAmounts={defaultTokenAmounts}
              onlyNativeToken={onlyNativeToken}
              destinationAddress={destinationAddress}
              requirements={totalRequirements as AddressBalanceRecord}
              onBridgeFunds={handleBridgeFunds}
            />
          )}
        </CardFlex>
      );
    case 'bridging':
      return (
        <Bridge
          bridgeFromDescription="Bridging amount includes fees."
          showCompleteScreen={showCompleteScreen}
          getBridgeRequirementsParams={handleGetBridgeRequirementsParams}
          onPrevBeforeBridging={handlePrevStep}
        />
      );
    default:
      throw new Error('Invalid add funds state');
  }
};
