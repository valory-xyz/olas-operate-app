import { CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Flex, message, Spin, Typography } from 'antd';
import { compact, sortBy } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { ERROR_ICON_STYLE, LoadingSpinner } from '@/components/ui';
import { TokenRequirementsTable } from '@/components/ui/TokenRequirementsTable';
import {
  ALL_TOKEN_CONFIG,
  TOKEN_CONFIG,
  TokenSymbol,
  TokenSymbolConfigMap,
  TokenType,
} from '@/config/tokens';
import { AddressZero, COLOR, MiddlewareChain } from '@/constants';
import {
  useBalanceAndRefillRequirementsContext,
  useBridgeRefillRequirements,
  useMasterWalletContext,
  useServices,
} from '@/hooks';
import { Address } from '@/types/Address';
import {
  BridgeRefillRequirementsRequest,
  CrossChainTransferDetails,
} from '@/types/Bridge';
import {
  areAddressesEqual,
  asEvmChainDetails,
  asEvmChainId,
  delayInSeconds,
  formatUnitsToNumber,
  getTokenDetails,
} from '@/utils';

type DepositTokenDetails = {
  address?: Address;
  symbol: TokenSymbol;
  totalRequiredInWei: bigint;
  pendingAmountInWei: bigint;
  currentBalanceInWei: bigint;
  areFundsReceived: boolean;
  decimals: number;
  isNative?: boolean;
  precision?: number;
};

const { Text } = Typography;

const FUNDS_RECEIVED_MESSAGE_KEY = 'deposited-funds';

const RootCard = styled(Flex)`
  align-items: start;
  border-radius: 12px;
  border: 1px solid ${COLOR.BORDER_GRAY};
  margin-top: 32px;
`;

const NATIVE_TOKEN_PRECISION = 5;
const ERC20_TOKEN_PRECISION = 2;

const formatTokenAmount = ({
  amountInWei,
  decimals,
  isNative,
}: {
  amountInWei: bigint;
  decimals: number;
  isNative: boolean;
}) =>
  formatUnitsToNumber(
    amountInWei,
    decimals,
    isNative ? NATIVE_TOKEN_PRECISION : ERC20_TOKEN_PRECISION,
  );

const RequestingQuote = () => (
  <Flex gap={8} align="center" className="p-16">
    <Spin indicator={<LoadingSpinner />} />
    <Text>Requesting quote...</Text>
  </Flex>
);

const QuoteRequestFailed = ({ onTryAgain }: { onTryAgain: () => void }) => (
  <Flex
    gap={8}
    className="p-16 border-box w-full"
    align="center"
    justify="space-between"
  >
    <Flex gap={8} align="center">
      <CloseCircleOutlined style={ERROR_ICON_STYLE} />
      <Text>Quote request failed</Text>
    </Flex>
    <Button onClick={onTryAgain} icon={<ReloadOutlined />} size="small">
      Try again
    </Button>
  </Flex>
);

type DepositForBridgingProps = {
  fromChain: MiddlewareChain;
  getBridgeRequirementsParams: (
    forceUpdate?: boolean,
  ) => BridgeRefillRequirementsRequest | null;
  updateQuoteId: (quoteId: string) => void;
  updateCrossChainTransferDetails: (details: CrossChainTransferDetails) => void;
  onNext: () => void;
  bridgeToChain: MiddlewareChain;
};

export const DepositForBridging = ({
  fromChain,
  getBridgeRequirementsParams,
  updateQuoteId,
  updateCrossChainTransferDetails,
  onNext,
  bridgeToChain,
}: DepositForBridgingProps) => {
  const { isLoading: isServicesLoading } = useServices();
  const { masterEoa, isFetched: isMasterWalletFetched } =
    useMasterWalletContext();
  const { isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();

  // State to control the force update of the bridge_refill_requirements API call
  // This is used when the user clicks on "Try again" button.
  const [isForceUpdate, setIsForceUpdate] = useState(false);
  const [
    isBridgeRefillRequirementsApiLoading,
    setIsBridgeRefillRequirementsApiLoading,
  ] = useState(true);
  const [
    canPollForBridgeRefillRequirements,
    setCanPollForBridgeRefillRequirements,
  ] = useState(true);
  // State to control the manual refetching of the bridge refill requirements
  const [isManuallyRefetching, setIsManuallyRefetching] = useState(false);

  const bridgeRequirementsParams = useMemo(() => {
    if (!getBridgeRequirementsParams) return null;
    return getBridgeRequirementsParams(isForceUpdate);
  }, [isForceUpdate, getBridgeRequirementsParams]);

  const {
    data: bridgeFundingRequirements,
    isLoading: isBridgeRefillRequirementsLoading,
    isError: isBridgeRefillRequirementsError,
    isFetching: isBridgeRefillRequirementsFetching,
    refetch: refetchBridgeRefillRequirements,
  } = useBridgeRefillRequirements(
    bridgeRequirementsParams,
    canPollForBridgeRefillRequirements,
  );

  // fetch bridge refill requirements manually on mount, this is to ensure
  // that stale values aren't shown - in case a user visits the bridging page again
  useEffect(() => {
    if (!isBridgeRefillRequirementsApiLoading) return;

    refetchBridgeRefillRequirements().finally(() => {
      setIsBridgeRefillRequirementsApiLoading(false);
    });
  }, [
    isBridgeRefillRequirementsApiLoading,
    refetchBridgeRefillRequirements,
    setIsBridgeRefillRequirementsApiLoading,
  ]);

  const isRequestingQuote =
    isBalancesAndFundingRequirementsLoading ||
    isBridgeRefillRequirementsApiLoading ||
    isBridgeRefillRequirementsLoading ||
    isServicesLoading ||
    isManuallyRefetching;

  const isRequestingQuoteFailed = useMemo(() => {
    if (isRequestingQuote) return false;
    if (isBridgeRefillRequirementsError) return true;

    // Even if the API call succeeds, if any entry has QUOTE_FAILED,
    // we should still display an error message and allow the user to retry.
    return bridgeFundingRequirements?.bridge_request_status.some(
      (request) => request.status === 'QUOTE_FAILED',
    );
  }, [
    isRequestingQuote,
    isBridgeRefillRequirementsError,
    bridgeFundingRequirements,
  ]);

  /**
   * Maximum of all the ETAs for the QUOTE_DONE requests.
   * For example, If there are two QUOTE_DONE requests with ETAs of 300 and 900 seconds,
   * then the quoteEta will be 900 seconds.
   */
  const quoteEta = useMemo(() => {
    if (isRequestingQuote) return;
    if (isRequestingQuoteFailed) return;
    if (!bridgeFundingRequirements) return;

    const quoteDoneRequests =
      bridgeFundingRequirements.bridge_request_status.filter(
        (request) => request.status === 'QUOTE_DONE',
      );
    if (quoteDoneRequests.length === 0) return;

    return Math.max(...quoteDoneRequests.map((request) => request.eta || 0));
  }, [isRequestingQuote, isRequestingQuoteFailed, bridgeFundingRequirements]);

  // If quote has failed, stop polling for bridge refill requirements
  useEffect(() => {
    if (!isRequestingQuoteFailed) return;
    setCanPollForBridgeRefillRequirements(false);
  }, [isRequestingQuoteFailed]);

  /**
   * List of tokens that need to be deposited
   *
   * Potential bug: doesn't return an empty array in case the quote is still being requested,
   * this can result in showing stale values as per the expired quotes.
   */
  const tokens = useMemo(() => {
    if (!bridgeFundingRequirements) return [];
    if (!masterEoa) return [];
    if (!isMasterWalletFetched) return [];

    const fromMiddlewareChain = fromChain;

    // TODO: check if master safe exists once we support agents on From Chain
    const destinationAddress = masterEoa.address;

    const bridgeTotalRequirements =
      bridgeFundingRequirements.bridge_total_requirements[
        fromMiddlewareChain
      ]?.[destinationAddress];
    const bridgeRefillRequirements =
      bridgeFundingRequirements.bridge_refill_requirements[
        fromMiddlewareChain
      ]?.[destinationAddress];

    if (!bridgeTotalRequirements || !bridgeRefillRequirements) return [];

    const totalRequirements = Object.entries(bridgeTotalRequirements);
    return totalRequirements.map(([tokenAddress, totalRequired]) => {
      const totalRequiredInWei = BigInt(totalRequired);
      const pendingAmountInWei = BigInt(
        bridgeRefillRequirements?.[tokenAddress as Address] || 0,
      );

      // current balance = total_required_amount - required_amount
      // eg. if total_required_amount = 1000 and required_amount = 200,
      // then the assumed current_balance = 1000 - 200 = 800
      const currentBalanceInWei = totalRequiredInWei - pendingAmountInWei;

      const fromChainId = asEvmChainDetails(fromMiddlewareChain).chainId;
      const fromChainTokenConfig = ALL_TOKEN_CONFIG[fromChainId];
      const token = Object.values(fromChainTokenConfig).find((tokenInfo) => {
        if (tokenAddress === AddressZero && !tokenInfo.address) return true;
        return areAddressesEqual(tokenInfo.address!, tokenAddress);
      });

      if (!token) {
        throw new Error(
          `Failed to get the token info for the following token address: ${tokenAddress}`,
        );
      }

      const areFundsReceived = totalRequiredInWei - currentBalanceInWei <= 0;

      return {
        address: tokenAddress as Address,
        symbol: token.symbol,
        totalRequiredInWei,
        pendingAmountInWei,
        currentBalanceInWei,
        areFundsReceived,
        decimals: token.decimals,
        isNative: token.tokenType === TokenType.NativeGas,
      } satisfies DepositTokenDetails;
    });
  }, [bridgeFundingRequirements, isMasterWalletFetched, masterEoa, fromChain]);

  const tokensDataSource = useMemo(() => {
    const mappedTokens = tokens.map((token) => {
      const { totalRequiredInWei, pendingAmountInWei, decimals, isNative } =
        token;
      const formatToken = (valueInWei: bigint) =>
        formatTokenAmount({ amountInWei: valueInWei, decimals, isNative });
      return {
        totalAmount: formatToken(totalRequiredInWei),
        pendingAmount: formatToken(pendingAmountInWei),
        symbol: token.symbol,
        iconSrc: TokenSymbolConfigMap[token.symbol].image,
        areFundsReceived: token.areFundsReceived,
      };
    });

    return sortBy(mappedTokens, 'totalAmount').reverse();
  }, [tokens]);

  // After the user has deposited the required funds,
  // send the quote ID, cross-chain transfer details to the next step
  useEffect(() => {
    if (isRequestingQuote) return;
    if (isBridgeRefillRequirementsFetching) return;
    if (!bridgeFundingRequirements) return;
    if (tokens.length === 0) return;
    if (isRequestingQuoteFailed) return;
    if (!masterEoa?.address) return;
    if (!isMasterWalletFetched) return;
    if (!quoteEta) return;
    if (!bridgeRequirementsParams?.bridge_requests) return;

    const areAllFundsReceived =
      tokens.every((token) => token.areFundsReceived) &&
      !bridgeFundingRequirements.is_refill_required;
    if (!areAllFundsReceived) return;
    updateQuoteId(bridgeFundingRequirements.id);
    updateCrossChainTransferDetails({
      fromChain,
      toChain: bridgeToChain,
      eta: quoteEta,
      transfers: compact(
        tokens.map((token) => {
          const toTokenDetails = bridgeRequirementsParams.bridge_requests?.find(
            ({ from }) =>
              areAddressesEqual(from.token, token.address || AddressZero),
          )?.to;

          if (!toTokenDetails) return;

          // Find the token address on the destination chain.
          // eg. if the token is USDC on Ethereum, it will be USDC on Base
          // but the address will be different.
          const toTokenConfig = getTokenDetails(
            toTokenDetails.token,
            TOKEN_CONFIG[asEvmChainId(bridgeToChain)],
          );
          if (!toTokenConfig) return;

          return {
            fromSymbol: token.symbol,
            fromAmount: token.currentBalanceInWei.toString(),
            toSymbol: token.isNative
              ? asEvmChainDetails(bridgeToChain).symbol
              : toTokenConfig.symbol,
            toAmount: BigInt(toTokenDetails.amount).toString(),
            decimals: token.decimals,
          };
        }),
      ),
    });

    // wait for 2 seconds before proceeding to the next step.
    message.success({
      content: 'Funds received, proceeding to next step...',
      key: FUNDS_RECEIVED_MESSAGE_KEY,
    });
    delayInSeconds(2).then(() => {
      message.destroy(FUNDS_RECEIVED_MESSAGE_KEY);
      onNext();
    });
  }, [
    isRequestingQuote,
    isBridgeRefillRequirementsFetching,
    isRequestingQuoteFailed,
    bridgeToChain,
    bridgeFundingRequirements,
    masterEoa,
    tokens,
    bridgeRequirementsParams,
    quoteEta,
    onNext,
    updateQuoteId,
    updateCrossChainTransferDetails,
    isMasterWalletFetched,
    fromChain,
  ]);

  // Retry to fetch the bridge refill requirements
  const handleRetryAgain = useCallback(async () => {
    setIsForceUpdate(true);
    setIsManuallyRefetching(true);
    setCanPollForBridgeRefillRequirements(false);

    await delayInSeconds(1); // slight delay before refetching.

    refetchBridgeRefillRequirements()
      .then(() => {
        // force_update: true is used only when the user clicks on "Try again",
        // hence reset it to false after the API call is made.
        setIsForceUpdate(false);
        // allow polling for bridge refill requirements again, once successful.
        setCanPollForBridgeRefillRequirements(true);
      })
      .finally(() => {
        setIsManuallyRefetching(false);
      });
  }, [refetchBridgeRefillRequirements]);

  if (isRequestingQuoteFailed) {
    return (
      <RootCard>
        <QuoteRequestFailed onTryAgain={handleRetryAgain} />
      </RootCard>
    );
  }

  if (tokensDataSource.length === 0 && isRequestingQuote) {
    return (
      <RootCard>
        <RequestingQuote />
      </RootCard>
    );
  }

  return (
    <TokenRequirementsTable
      tokensDataSource={tokensDataSource}
      locale={{ emptyText: 'No tokens to deposit!' }}
      className="mt-32"
    />
  );
};
