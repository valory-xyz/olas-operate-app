import {
  CheckSquareOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Button, Divider, Flex, Spin, Typography } from 'antd';
import { upperFirst } from 'lodash';
import Image from 'next/image';
import { useEffect, useMemo } from 'react';
import styled from 'styled-components';

import {
  AddressBalanceRecord,
  MasterSafeBalanceRecord,
  MiddlewareChain,
} from '@/client';
import { ETHEREUM_TOKEN_CONFIG, TokenType } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { COLOR } from '@/constants/colors';
import { TokenSymbol } from '@/enums/Token';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useBridgeRefillRequirements } from '@/hooks/useBridgeRefillRequirements';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { Address } from '@/types/Address';
import { CrossChainTransferDetails } from '@/types/Bridge';
import { areAddressesEqual } from '@/utils/address';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

import { InfoTooltip } from '../InfoTooltip';
import {
  ERROR_ICON_STYLE,
  LIGHT_ICON_STYLE,
  SUCCESS_ICON_STYLE,
  WARNING_ICON_STYLE,
} from '../ui/iconStyles';
import { DepositAddress } from './DepositAddress';
import { getBridgeRequirementsParams } from './utils';

const { Text } = Typography;

const RootCard = styled(Flex)`
  align-items: start;
  border-radius: 12px;
  border: 1px solid ${COLOR.BORDER_GRAY};
`;

const DepositForBridgingHeader = ({ chainName }: { chainName: string }) => (
  <Flex gap={8} align="center" className="p-16">
    <Image
      src={`/chains/${chainName}-chain.png`}
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

const QuoteRequestFailed = () => (
  <Flex
    gap={8}
    className="p-16 border-box"
    align="center"
    justify="space-between"
    style={{ width: '100%' }}
  >
    <Flex gap={8} align="center">
      <CloseCircleOutlined style={ERROR_ICON_STYLE} />
      <Text>Quote request failed</Text>
    </Flex>
    <Button disabled icon={<ReloadOutlined />} size="small">
      Try again
    </Button>
  </Flex>
);

type TokenDetails = {
  address?: Address;
  symbol: TokenSymbol;
  totalRequiredInWei: bigint;
  currentBalanceInWei: bigint;
  areFundsReceived: boolean;
  decimals: number;
  isNative?: boolean;
  precision?: number;
};

type TokenInfoProps = TokenDetails;

const TokenInfo = ({
  symbol,
  totalRequiredInWei,
  currentBalanceInWei,
  areFundsReceived,
  decimals,
  isNative,
  precision = 2,
}: TokenDetails) => {
  const depositRequiredInWei = totalRequiredInWei - currentBalanceInWei;

  return (
    <Flex gap={8} align="center">
      {areFundsReceived ? (
        <>
          <CheckSquareOutlined style={SUCCESS_ICON_STYLE} />
          <Text strong>{symbol}</Text> funds received!
        </>
      ) : (
        <>
          <ClockCircleOutlined style={WARNING_ICON_STYLE} />
          <Text className="loading-ellipses">
            Waiting for{' '}
            <Text strong>
              {formatUnitsToNumber(depositRequiredInWei, decimals, precision)}
              &nbsp;
              {symbol}
            </Text>
          </Text>
        </>
      )}

      <InfoTooltip overlayInnerStyle={{ width: 300 }} placement="top">
        <Flex vertical gap={12} className="p-8">
          <Flex justify="space-between">
            <Text type="secondary" className="text-sm">
              Total amount required
            </Text>
            <Text
              className="text-sm"
              strong
            >{`${formatUnitsToNumber(totalRequiredInWei, decimals, precision)} ${symbol}`}</Text>
          </Flex>
          <Flex justify="space-between">
            <Text type="secondary" className="text-sm">
              Balance at deposit address
            </Text>
            <Text
              className="text-sm"
              strong
            >{`${formatUnitsToNumber(currentBalanceInWei, decimals, precision)} ${symbol}`}</Text>
          </Flex>
          <Divider className="m-0" />
          <Flex justify="space-between">
            <Text className="text-sm" strong>
              Deposit required
            </Text>
            <Text
              className="text-sm"
              strong
            >{`${formatUnitsToNumber(depositRequiredInWei, decimals, precision)} ${symbol}`}</Text>
          </Flex>
          {isNative && (
            <Text type="secondary" className="text-sm">
              The total amount may fluctuate due to periodic quote updates.
            </Text>
          )}
        </Flex>
      </InfoTooltip>
    </Flex>
  );
};

type DepositForBridgingProps = {
  chainName: string;
  updateQuoteId: (quoteId: string) => void;
  updateCrossChainTransferDetails: (details: CrossChainTransferDetails) => void;
  onNext: () => void;
};

export const DepositForBridging = ({
  chainName,
  updateQuoteId,
  updateCrossChainTransferDetails,
  onNext,
}: DepositForBridgingProps) => {
  const { selectedAgentConfig } = useServices();
  const toMiddlewareChain = selectedAgentConfig.middlewareHomeChainId;
  const { masterEoa } = useMasterWalletContext();

  const { refillRequirements, isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();

  const bridgeRequirementsParams = useMemo(() => {
    if (isBalancesAndFundingRequirementsLoading) return null;
    if (!masterEoa) return null;
    if (!refillRequirements) return null;

    return getBridgeRequirementsParams({
      fromAddress: masterEoa.address,
      toAddress: masterEoa.address,
      toMiddlewareChain,
      refillRequirements,
    });
  }, [
    isBalancesAndFundingRequirementsLoading,
    masterEoa,
    toMiddlewareChain,
    refillRequirements,
  ]);

  const {
    data: bridgeFundingRequirements,
    isLoading: isBridgeRefillRequirementsLoading,
    isError: isBridgeRefillRequirementsError,
  } = useBridgeRefillRequirements(bridgeRequirementsParams);

  const isRequestingQuote =
    isBalancesAndFundingRequirementsLoading ||
    isBridgeRefillRequirementsLoading;

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

    return Object.entries(bridgeTotalRequirements).map(
      ([tokenAddress, totalRequired]) => {
        const totalRequiredInWei = BigInt(totalRequired);
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
        } satisfies TokenInfoProps;
      },
    );
  }, [bridgeFundingRequirements, masterEoa]);

  // After the user has deposited the required funds,
  // send the quote ID, cross-chain transfer details to the next step
  useEffect(() => {
    if (isRequestingQuote) return;
    if (!bridgeFundingRequirements) return;
    if (tokens.length === 0) return;

    const areAllFundsReceived =
      tokens.every((token) => token.areFundsReceived) &&
      !bridgeFundingRequirements.is_refill_required;
    if (!areAllFundsReceived) return;

    updateQuoteId(bridgeFundingRequirements.id);
    updateCrossChainTransferDetails({
      fromChain: upperFirst(MiddlewareChain.ETHEREUM),
      toChain: upperFirst(toMiddlewareChain),
      transfers: tokens.map((token) => {
        const toAmount = (() => {
          if (!masterEoa?.address) return;

          const masterSafeAmount = (
            refillRequirements as MasterSafeBalanceRecord
          )?.master_safe?.[token.address];
          const masterEoaAmount = (
            refillRequirements as AddressBalanceRecord
          )?.[masterEoa.address]?.[token.address];

          return (masterSafeAmount || 0) + (masterEoaAmount || 0);
        })();

        return {
          fromSymbol: token.symbol,
          fromAmount: token.currentBalanceInWei.toString(),
          toSymbol: token.symbol,
          toAmount: toAmount?.toString() || '0',
          decimals: token.decimals,
        };
      }),
    });
    onNext();
  }, [
    isRequestingQuote,
    toMiddlewareChain,
    refillRequirements,
    bridgeFundingRequirements,
    masterEoa,
    tokens,
    onNext,
    updateQuoteId,
    updateCrossChainTransferDetails,
  ]);

  return (
    <RootCard vertical>
      <DepositForBridgingHeader chainName={chainName} />
      <Divider className="m-0" />

      {isRequestingQuote ? (
        <RequestingQuote />
      ) : isBridgeRefillRequirementsError ? (
        <QuoteRequestFailed />
      ) : (
        <>
          <Flex gap={8} align="start" vertical className="p-16">
            {tokens.length === 0 ? (
              <Flex gap={8} align="center">
                No tokens to deposit!
              </Flex>
            ) : (
              <>
                {tokens.map((token) => (
                  <TokenInfo
                    key={token.symbol}
                    {...token}
                    precision={token.isNative ? 4 : 2}
                  />
                ))}
              </>
            )}
          </Flex>
          <Divider className="m-0" />
          <DepositAddress />
        </>
      )}
    </RootCard>
  );
};
