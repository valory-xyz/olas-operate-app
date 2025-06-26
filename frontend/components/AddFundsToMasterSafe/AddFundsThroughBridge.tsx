import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Flex, Image, Typography } from 'antd';
import { isNil } from 'lodash';
import { useCallback, useMemo, useState } from 'react';

import { MiddlewareChain } from '@/client';
import { ETHEREUM_TOKEN_CONFIG, TOKEN_CONFIG } from '@/config/tokens';
import { Pages } from '@/enums/Pages';
import { TokenSymbol } from '@/enums/Token';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { Address } from '@/types/Address';
import { BridgeRefillRequirementsRequest, BridgeRequest } from '@/types/Bridge';
import {
  asEvmChainId,
  toMiddlewareChainFromTokenSymbol,
} from '@/utils/middlewareHelpers';
import { parseUnits } from '@/utils/numberFormatters';

import { Bridge } from '../Bridge/Bridge';
import { getFromToken } from '../Bridge/utils';
import { NumberInput } from '../NumberInput';
import { CardFlex } from '../styled/CardFlex';
import { useGenerateInputsToAddFundsToMasterSafe } from './useGenerateInputsToAddFundsToMasterSafe';

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

const fromChainConfig = ETHEREUM_TOKEN_CONFIG;

/**
 * Get bridge requirements parameters from the input provided by the user
 */
const useGetBridgeRequirementsParams = () => {
  const { masterEoa, masterSafes } = useMasterWalletContext();
  const { selectedAgentConfig } = useServices();
  const toMiddlewareChain = selectedAgentConfig.middlewareHomeChainId;
  const toChainConfig = TOKEN_CONFIG[asEvmChainId(toMiddlewareChain)];
  const masterSafe = masterSafes?.find(
    ({ evmChainId: chainId }) => selectedAgentConfig.evmHomeChainId === chainId,
  );

  return useCallback(
    (tokenAddress: Address, amount: number): BridgeRequest => {
      if (!masterEoa) throw new Error('Master EOA is not available');
      if (!masterSafe) throw new Error('Master Safe is not available');

      const fromToken = getFromToken(
        tokenAddress,
        fromChainConfig,
        toChainConfig,
      );

      return {
        from: {
          chain: MiddlewareChain.ETHEREUM,
          address: masterEoa.address,
          token: fromToken,
        },
        to: {
          chain: toMiddlewareChain,
          address: masterSafe.address,
          token: tokenAddress,
          amount: parseUnits(amount),
        },
      };
    },
    [toMiddlewareChain, toChainConfig, masterEoa, masterSafe],
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
      .filter((item) => item !== null);

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
          showCompleteScreen={true}
          completionMessage="Funds have been bridged to your Pearl Safe."
          getBridgeRequirementsParams={handleGetBridgeRequirementsParams}
          onPrevBeforeBridging={handlePrevStep}
        />
      );
    default:
      throw new Error('Invalid add funds state');
  }
};
