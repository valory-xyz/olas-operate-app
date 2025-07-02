import {
  CloseCircleOutlined,
  LoadingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Button, Divider, Flex, message, Spin, Typography } from 'antd';
import { kebabCase, upperFirst } from 'lodash';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { MiddlewareChain } from '@/client';
import { ERROR_ICON_STYLE, LIGHT_ICON_STYLE } from '@/components/ui/iconStyles';
import {
  ETHEREUM_TOKEN_CONFIG,
  TOKEN_CONFIG,
  TokenType,
} from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { COLOR } from '@/constants/colors';
import { TokenSymbol } from '@/enums/Token';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useBridgeRefillRequirements } from '@/hooks/useBridgeRefillRequirements';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { Address } from '@/types/Address';
import {
  BridgeRefillRequirementsRequest,
  CrossChainTransferDetails,
} from '@/types/Bridge';
import { areAddressesEqual } from '@/utils/address';
import { delayInSeconds } from '@/utils/delay';
import { asEvmChainDetails, asEvmChainId } from '@/utils/middlewareHelpers';

import { DepositAddress } from './DepositAddress';
import { DepositTokenDetails, TokenDetails } from './TokenDetails';

const { Text } = Typography;

const FUNDS_RECEIVED_MESSAGE_KEY = 'deposited-funds';

const RootCard = styled(Flex)`
  align-items: start;
  border-radius: 12px;
  border: 1px solid ${COLOR.BORDER_GRAY};
`;

const DepositForBridgingHeader = ({ chainName }: { chainName: string }) => (
  <Flex gap={8} align="center" className="p-16">
    <Image
      src={`/chains/${kebabCase(chainName)}-chain.png`}
      width={20}
      height={20}
      alt={`${chainName} logo`}
    />
    <Text>{upperFirst(chainName)}</Text>
  </Flex>
);

const RequestingQuote = () => (
  <Flex gap={8} className="p-16">
    <Spin indicator={<LoadingOutlined spin style={LIGHT_ICON_STYLE} />} />
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
  chainName: string;
  getBridgeRequirementsParams: (
    forceUpdate?: boolean,
  ) => BridgeRefillRequirementsRequest | null;
  updateQuoteId: (quoteId: string) => void;
  updateCrossChainTransferDetails: (details: CrossChainTransferDetails) => void;
  onNext: () => void;
};

export const DepositForBridging = ({
  chainName,
  getBridgeRequirementsParams,
  updateQuoteId,
  updateCrossChainTransferDetails,
  onNext,
}: DepositForBridgingProps) => {
  const { isLoading: isServicesLoading, selectedAgentConfig } = useServices();
  const toMiddlewareChain = selectedAgentConfig.middlewareHomeChainId;
  const { masterEoa } = useMasterWalletContext();
  const { isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();

  // State to control the force update of the bridge refill requirements API call
  // This is used when the user clicks on "Try again" button
  // to fetch the bridge refill requirements again.
  // NOTE: It is reset to false after the API call is made.
  const [isForceUpdate, setIsForceUpdate] = useState(false);
  const [
    isBridgeRefillRequirementsApiLoading,
    setIsBridgeRefillRequirementsApiLoading,
  ] = useState(true);
  const [
    canPollForBridgeRefillRequirements,
    setCanPollForBridgeRefillRequirements,
  ] = useState(true);

  const bridgeRequirementsParams = useMemo(() => {
    if (!getBridgeRequirementsParams) return null;
    return getBridgeRequirementsParams(isForceUpdate);
  }, [isForceUpdate, getBridgeRequirementsParams]);

  // force_update: true is used only when the user clicks on "Try again",
  // hence reset it to false after the API call is made.
  const resetForceUpdate = useCallback(() => setIsForceUpdate(false), []);

  const {
    data: bridgeFundingRequirements,
    isLoading: isBridgeRefillRequirementsLoading,
    isError: isBridgeRefillRequirementsError,
    isFetching: isBridgeRefillRequirementsFetching,
    refetch: refetchBridgeRefillRequirements,
  } = useBridgeRefillRequirements(
    bridgeRequirementsParams,
    canPollForBridgeRefillRequirements,
    isForceUpdate ? resetForceUpdate : undefined,
  );

  // fetch bridge refill requirements manually on mount
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
    isServicesLoading;

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

  // List of tokens that need to be deposited
  const tokens = useMemo(() => {
    if (!bridgeFundingRequirements) return [];
    if (!masterEoa) return [];

    const fromMiddlewareChain = MiddlewareChain.ETHEREUM;

    const bridgeTotalRequirements =
      bridgeFundingRequirements.bridge_total_requirements[
        fromMiddlewareChain
      ]?.[masterEoa.address];
    const bridgeRefillRequirements =
      bridgeFundingRequirements.bridge_refill_requirements[
        fromMiddlewareChain
      ]?.[masterEoa.address];

    if (!bridgeTotalRequirements || !bridgeRefillRequirements) return [];

    const totalRequirements = Object.entries(bridgeTotalRequirements);
    return totalRequirements.map(([tokenAddress, totalRequired]) => {
      const totalRequiredInWei = BigInt(totalRequired);

      // current balance = total_required_amount - required_amount
      // eg. if total_required_amount = 1000 and required_amount = 200,
      // then the assumed current_balance = 1000 - 200 = 800
      const currentBalanceInWei =
        totalRequiredInWei -
        BigInt(bridgeRefillRequirements[tokenAddress as Address] || 0);

      const token = Object.values(ETHEREUM_TOKEN_CONFIG).find((tokenInfo) => {
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
        currentBalanceInWei,
        areFundsReceived,
        decimals: token.decimals,
        isNative: token.tokenType === TokenType.NativeGas,
      } satisfies DepositTokenDetails;
    });
  }, [bridgeFundingRequirements, masterEoa]);

  // After the user has deposited the required funds,
  // send the quote ID, cross-chain transfer details to the next step
  useEffect(() => {
    if (isRequestingQuote) return;
    if (isBridgeRefillRequirementsFetching) return;
    if (!bridgeFundingRequirements) return;
    if (tokens.length === 0) return;
    if (isRequestingQuoteFailed) return;
    if (!masterEoa?.address) return;
    if (!quoteEta) return;

    const areAllFundsReceived =
      tokens.every((token) => token.areFundsReceived) &&
      !bridgeFundingRequirements.is_refill_required;
    if (!areAllFundsReceived) return;
    updateQuoteId(bridgeFundingRequirements.id);
    updateCrossChainTransferDetails({
      fromChain: MiddlewareChain.ETHEREUM,
      toChain: toMiddlewareChain,
      eta: quoteEta,
      transfers: tokens.map((token) => {
        const toAmount = (() => {
          // TODO: reuse getFromToken function from utils.ts

          // Find the token address on the destination chain.
          // eg. if the token is USDC on Ethereum, it will be USDC on Base
          // but the address will be different.
          const chainTokenConfig =
            TOKEN_CONFIG[asEvmChainId(toMiddlewareChain)][token.symbol];
          const toTokenAddress =
            token.symbol === TokenSymbol.ETH
              ? token.address
              : chainTokenConfig.address;

          if (!toTokenAddress) return BigInt(0);

          const toToken = bridgeRequirementsParams?.bridge_requests?.find(
            ({ to }) => areAddressesEqual(to.token, toTokenAddress),
          );
          if (!toToken) return BigInt(0);

          return BigInt(toToken.to.amount);
        })();

        return {
          fromSymbol: token.symbol,
          fromAmount: token.currentBalanceInWei.toString(),
          toSymbol: token.isNative
            ? asEvmChainDetails(toMiddlewareChain).symbol
            : token.symbol,
          toAmount: toAmount.toString(),
          decimals: token.decimals,
        };
      }),
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
    toMiddlewareChain,
    bridgeFundingRequirements,
    masterEoa,
    tokens,
    bridgeRequirementsParams,
    quoteEta,
    onNext,
    updateQuoteId,
    updateCrossChainTransferDetails,
  ]);

  // Retry to fetch the bridge refill requirements
  const handleRetryAgain = useCallback(() => {
    setIsForceUpdate(true);
    setCanPollForBridgeRefillRequirements(true);
  }, []);

  return (
    <RootCard vertical>
      <DepositForBridgingHeader chainName={chainName} />
      <Divider className="m-0" />

      {isRequestingQuote ? (
        <RequestingQuote />
      ) : isRequestingQuoteFailed ? (
        <QuoteRequestFailed onTryAgain={handleRetryAgain} />
      ) : (
        <>
          <Flex gap={8} align="start" vertical className="p-16">
            {tokens.length === 0 ? (
              <Flex gap={8} align="center">
                No tokens to deposit!
              </Flex>
            ) : (
              tokens.map((token) => (
                <TokenDetails
                  key={token.symbol}
                  {...token}
                  precision={token.isNative ? 5 : 2}
                />
              ))
            )}
          </Flex>
          <Divider className="m-0" />
          <DepositAddress />
        </>
      )}
    </RootCard>
  );
};
