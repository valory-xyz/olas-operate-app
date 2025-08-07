import { ReloadOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getTokenDetails } from '@/components/Bridge/utils';
import { FundsAreSafeMessage } from '@/components/ui/FundsAreSafeMessage';
import { TransactionStep } from '@/components/ui/TransactionSteps';
import { TOKEN_CONFIG } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { EvmChainId } from '@/constants/chains';
import { TokenSymbol } from '@/constants/token';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useBridgeRefillRequirementsOnDemand } from '@/hooks/useBridgeRefillRequirementsOnDemand';
import { useBridgingSteps } from '@/hooks/useBridgingSteps';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useServices } from '@/hooks/useServices';
import { delayInSeconds } from '@/utils/delay';
import { asEvmChainDetails, asEvmChainId } from '@/utils/middlewareHelpers';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

import { useGetBridgeRequirementsParams } from '../../hooks/useGetBridgeRequirementsParams';

const { Text } = Typography;

/**
 * Hook to calculate the bridge requirements for the swapping process after on-ramp,
 */
const useBridgeRequirements = (onRampChainId: EvmChainId) => {
  const { isOnRampingStepCompleted } = useOnRampContext();
  const { selectedAgentConfig } = useServices();
  const { isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();

  // State to control the force update of the bridge_refill_requirements API call
  // This is used when the user clicks on "Try again" button.
  const [isForceUpdate, setIsForceUpdate] = useState(false);
  const [
    isBridgeRefillRequirementsApiLoading,
    setIsBridgeRefillRequirementsApiLoading,
  ] = useState(true);
  const [isManuallyRefetching, setIsManuallyRefetching] = useState(false);

  const getBridgeRequirementsParams = useGetBridgeRequirementsParams(
    onRampChainId,
    AddressZero,
    'to',
  );

  const bridgeParams = useMemo(() => {
    if (!getBridgeRequirementsParams) return null;
    return getBridgeRequirementsParams(isForceUpdate);
  }, [isForceUpdate, getBridgeRequirementsParams]);

  // Cannot bridge the token if the onRampChainId is the same as the middleware home chain.
  // eg. for Optimism, we cannot bridge ETH to Optimism if we are on Optimism.
  const canIgnoreNativeToken =
    selectedAgentConfig.evmHomeChainId === onRampChainId;

  // Filter out the native token from the bridge requests
  const bridgeParamsExceptNativeToken = useMemo(() => {
    if (!bridgeParams) return null;

    const filteredParams = bridgeParams.bridge_requests.filter(
      ({ to }) => to.token !== AddressZero,
    );
    const bridgeRequest = canIgnoreNativeToken
      ? filteredParams
      : bridgeParams.bridge_requests;
    return { ...bridgeParams, bridge_requests: bridgeRequest };
  }, [bridgeParams, canIgnoreNativeToken]);

  const {
    data: bridgeFundingRequirements,
    isLoading: isBridgeRefillRequirementsLoading,
    isError: isBridgeRefillRequirementsError,
    isFetching: isBridgeRefillRequirementsFetching,
    refetch: refetchBridgeRefillRequirements,
  } = useBridgeRefillRequirementsOnDemand(bridgeParamsExceptNativeToken);

  // fetch bridge refill requirements manually on mount
  useEffect(() => {
    if (!isBridgeRefillRequirementsApiLoading) return;
    if (!isOnRampingStepCompleted) return;

    refetchBridgeRefillRequirements().finally(() => {
      setIsBridgeRefillRequirementsApiLoading(false);
    });
  }, [
    isBridgeRefillRequirementsApiLoading,
    isOnRampingStepCompleted,
    refetchBridgeRefillRequirements,
    setIsBridgeRefillRequirementsApiLoading,
  ]);

  const isLoading =
    isBalancesAndFundingRequirementsLoading ||
    isBridgeRefillRequirementsLoading ||
    isBridgeRefillRequirementsFetching ||
    isBridgeRefillRequirementsApiLoading ||
    isManuallyRefetching;

  const hasAnyQuoteFailed = useMemo(() => {
    if (!bridgeFundingRequirements) return false;
    return bridgeFundingRequirements.bridge_request_status.some(
      ({ status }) => status === 'QUOTE_FAILED',
    );
  }, [bridgeFundingRequirements]);

  const receivingTokens = useMemo(() => {
    if (!bridgeParams) return [];

    const toChainId = asEvmChainId(selectedAgentConfig.middlewareHomeChainId);
    const toChainConfig = TOKEN_CONFIG[toChainId];

    return bridgeParams.bridge_requests.map((request) => {
      const { token: toToken, amount } = request.to;
      const token = getTokenDetails(toToken, toChainConfig);
      return {
        amount: formatUnitsToNumber(amount, token?.decimals),
        symbol: token?.symbol as TokenSymbol,
      };
    });
  }, [bridgeParams, selectedAgentConfig.middlewareHomeChainId]);

  /**
   * List of tokens to bridge, excluding the native token, if onRampChainId
   * matches the middleware home chain.
   *
   * For example,
   * - Optimus, tokens to bridge: [USDC, OLAS]
   * - Gnosis, tokens to bridge: [ETH, USDC, OLAS]
   */
  const tokensToBeBridged = useMemo(() => {
    if (receivingTokens.length === 0) return [];

    const currentChainSymbol = asEvmChainDetails(
      selectedAgentConfig.middlewareHomeChainId,
    ).symbol;

    if (!canIgnoreNativeToken) {
      return receivingTokens.map((token) => token.symbol);
    }

    const filteredTokens = receivingTokens.filter(
      (token) => token.symbol !== currentChainSymbol,
    );
    return filteredTokens.map((token) => token.symbol);
  }, [
    selectedAgentConfig.middlewareHomeChainId,
    canIgnoreNativeToken,
    receivingTokens,
  ]);

  // Retry to fetch the bridge refill requirements
  const onRetry = useCallback(async () => {
    setIsForceUpdate(true);
    setIsManuallyRefetching(true);

    // slight delay before refetching.
    await delayInSeconds(1);

    refetchBridgeRefillRequirements()
      .then(() => {
        // force_update: true is used only when the user clicks on "Try again",
        // hence reset it to false after the API call is made.
        setIsForceUpdate(false);
      })
      .finally(() => {
        setIsManuallyRefetching(false);
      });
  }, [refetchBridgeRefillRequirements]);

  return {
    isLoading,
    hasError: isBridgeRefillRequirementsError || hasAnyQuoteFailed,
    bridgeFundingRequirements,
    receivingTokens,
    tokensToBeBridged,
    onRetry,
  };
};

const TITLE = 'Swap funds';

type SwapFundsStep = {
  isSwapCompleted: boolean;
  tokensToBeTransferred: TokenSymbol[];
  step: TransactionStep;
};

const EMPTY_STATE: SwapFundsStep = {
  isSwapCompleted: false,
  tokensToBeTransferred: [],
  step: {
    status: 'wait',
    title: TITLE,
    subSteps: [],
  },
};

const PROCESS_STATE: SwapFundsStep = {
  isSwapCompleted: false,
  tokensToBeTransferred: [],
  step: {
    status: 'process',
    title: TITLE,
    subSteps: [{ description: 'Sending transaction...' }],
  },
};

const getQuoteFailedErrorState = (onRetry: () => void): SwapFundsStep => ({
  isSwapCompleted: false,
  tokensToBeTransferred: [],
  step: {
    status: 'error',
    title: TITLE,
    subSteps: [
      {
        failed: (
          <Flex vertical gap={8} align="flex-start">
            <Text className="text-sm text-lighter">Quote request failed</Text>
            <Button onClick={onRetry} icon={<ReloadOutlined />} size="small">
              Try again
            </Button>
          </Flex>
        ),
      },
    ],
  },
});

/**
 * Hook to manage the swap funds step in the on-ramping process.
 */
export const useSwapFundsStep = (
  onRampChainId: EvmChainId,
  isOnRampingCompleted: boolean,
) => {
  const {
    isLoading,
    hasError,
    bridgeFundingRequirements,
    receivingTokens,
    tokensToBeBridged,
    onRetry,
  } = useBridgeRequirements(onRampChainId);

  // If the on-ramping is not completed, we do not proceed with the swap step.
  const quoteId = useMemo(() => {
    if (isLoading) return;
    if (!isOnRampingCompleted) return;
    if (!bridgeFundingRequirements) return;
    return bridgeFundingRequirements.id;
  }, [isLoading, isOnRampingCompleted, bridgeFundingRequirements]);

  const { isBridgingCompleted, isBridgingFailed, isBridging, bridgeStatus } =
    useBridgingSteps(tokensToBeBridged, quoteId);

  const bridgeStepStatus = useMemo(() => {
    if (!isOnRampingCompleted) return 'wait';
    if (isLoading || isBridging) return 'process';
    if (isBridgingFailed) return 'error';
    if (isBridgingCompleted) return 'finish';
    return 'process';
  }, [
    isOnRampingCompleted,
    isLoading,
    isBridging,
    isBridgingFailed,
    isBridgingCompleted,
  ]);

  const tokensToBeTransferred = useMemo(() => {
    if (!receivingTokens) return [];
    return receivingTokens.map(({ symbol }) => symbol);
  }, [receivingTokens]);

  if (!isOnRampingCompleted) return EMPTY_STATE;
  if (isLoading || isBridging) return PROCESS_STATE;
  if (hasError) return getQuoteFailedErrorState(onRetry);

  return {
    isSwapCompleted: isBridgingCompleted,
    tokensToBeTransferred,
    step: {
      status: bridgeStepStatus,
      title: TITLE,
      subSteps: (bridgeStatus || []).map(({ status, symbol, txnLink }) => {
        const description = (() => {
          if (status === 'finish') return `Swap ${symbol || ''} complete.`;
          if (status === 'error') return `Swap ${symbol || ''} failed.`;
          return `Sending transaction...`;
        })();

        return {
          description,
          txnLink,
          failed: status === 'error' && (
            <FundsAreSafeMessage
              onRetry={onRetry}
              onRetryProps={{ isLoading: bridgeStepStatus === 'process' }}
            />
          ),
        };
      }),
    },
  } satisfies SwapFundsStep;
};
