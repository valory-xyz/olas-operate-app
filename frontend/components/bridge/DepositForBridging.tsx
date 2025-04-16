import {
  CheckSquareOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import {
  Button,
  Divider,
  Flex,
  message,
  Spin,
  Tooltip,
  Typography,
} from 'antd';
import { upperFirst } from 'lodash';
import Image from 'next/image';
import { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { MiddlewareChain } from '@/client';
import { ETHEREUM_TOKEN_CONFIG, TokenType } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { COLOR } from '@/constants/colors';
import { TokenSymbol } from '@/enums/Token';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useBridgeRefillRequirements } from '@/hooks/useBridgeRefillRequirements';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { Address } from '@/types/Address';
import { copyToClipboard } from '@/utils/copyToClipboard';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

import { InfoTooltip } from '../InfoTooltip';
import {
  LIGHT_ICON_STYLE,
  SUCCESS_ICON_STYLE,
  WARNING_ICON_STYLE,
} from '../ui/iconStyles';
import { getBridgeRequirementsParams } from './utils';

const { Text } = Typography;

const RootCard = styled(Flex)`
  align-items: start;
  border-radius: 12px;
  border: 1px solid ${COLOR.BORDER_GRAY};
`;

type TokenInfoProps = {
  symbol: TokenSymbol;
  totalRequiredInWei: bigint;
  currentBalanceInWei: bigint;
  decimals: number;
  isNative?: boolean;
  precision?: number;
};

const TokenInfo = ({
  symbol,
  totalRequiredInWei,
  currentBalanceInWei,
  decimals,
  isNative,
  precision = 2,
}: TokenInfoProps) => {
  const depositRequiredInWei = totalRequiredInWei - currentBalanceInWei;
  const areFundsReceived = depositRequiredInWei <= 0;

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

// TODO: make a shared component similar to AccountCreationAddress
// in frontend/components/SetupPage/Create/SetupEoaFunding.tsx
const DepositAddress = () => {
  const { masterEoa } = useMasterWalletContext();
  const address = masterEoa?.address;

  const handleCopyAddress = useCallback(() => {
    if (address) {
      copyToClipboard(address).then(() => message.success('Address copied!'));
    }
  }, [address]);

  return (
    <Flex gap={8} vertical className="p-16">
      <Flex justify="space-between" align="center">
        <Text className="text-sm" type="secondary">
          Deposit address
        </Text>
        <Flex gap={10}>
          <Tooltip title="Copy to clipboard" placement="left">
            <Button
              onClick={handleCopyAddress}
              size="small"
              icon={<CopyOutlined style={LIGHT_ICON_STYLE} />}
            />
          </Tooltip>
        </Flex>
      </Flex>

      <span className="can-select-text break-word">{`${address}`}</span>
    </Flex>
  );
};

type DepositForBridgingProps = {
  chainName: string;
};

export const DepositForBridging = ({ chainName }: DepositForBridgingProps) => {
  const { selectedAgentConfig } = useServices();
  const { middlewareHomeChainId } = selectedAgentConfig;
  const { masterEoa } = useMasterWalletContext();

  const { refillRequirements, isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();

  const bridgeRequirementsParams = useMemo(() => {
    if (isBalancesAndFundingRequirementsLoading) return null;
    if (!masterEoa) return null;

    return getBridgeRequirementsParams({
      fromAddress: masterEoa.address,
      toAddress: masterEoa.address,
      toMiddlewareChain: middlewareHomeChainId,
      refillRequirements,
    });
  }, [
    isBalancesAndFundingRequirementsLoading,
    masterEoa,
    middlewareHomeChainId,
    refillRequirements,
  ]);

  const {
    data: bridgeRefillRequirements,
    isLoading: isBridgeRefillRequirementsLoading,
  } = useBridgeRefillRequirements(bridgeRequirementsParams);

  const isRequestingQuote =
    isBalancesAndFundingRequirementsLoading ||
    isBridgeRefillRequirementsLoading;

  const tokens = useMemo(() => {
    if (!bridgeRefillRequirements) return [];
    if (!masterEoa) return [];

    const fromMiddlewareChain = MiddlewareChain.ETHEREUM;

    const totalRequirements =
      bridgeRefillRequirements.bridge_total_requirements[fromMiddlewareChain]?.[
        masterEoa.address
      ] || {};
    const refillRequirements =
      bridgeRefillRequirements.bridge_total_requirements[fromMiddlewareChain]?.[
        masterEoa.address
      ] || {};

    return Object.entries(totalRequirements).map(
      ([tokenAddress, totalRequired]) => {
        const totalRequiredInWei = BigInt(totalRequired);
        const currentBalanceInWei =
          totalRequiredInWei -
          BigInt(refillRequirements[tokenAddress as Address] || 0);

        const token = Object.values(ETHEREUM_TOKEN_CONFIG).find((tokenInfo) => {
          if (tokenAddress === AddressZero && !tokenInfo.address) return true;
          return (
            tokenInfo.address?.toLowerCase() === tokenAddress.toLowerCase()
          );
        });

        if (!token) {
          throw new Error(
            `Failed to get the token info for the following token address: ${tokenAddress}`,
          );
        }

        return {
          symbol: token.symbol,
          totalRequiredInWei,
          currentBalanceInWei,
          decimals: token.decimals,
          isNative: token.tokenType === TokenType.NativeGas,
        };
      },
    );
  }, [bridgeRefillRequirements, masterEoa]);

  return (
    <RootCard vertical>
      <Flex gap={8} align="center" className="p-16">
        <Image
          src={`/chains/${chainName}-chain.png`}
          width={20}
          height={20}
          alt="chain logo"
        />
        <Text>{upperFirst(chainName)}</Text>
      </Flex>

      <Divider className="m-0" />

      {isRequestingQuote ? (
        <Flex gap={8} className="p-16">
          <Spin indicator={<LoadingOutlined spin style={LIGHT_ICON_STYLE} />} />
          <Text>Requesting quote...</Text>
        </Flex>
      ) : (
        <>
          <Flex gap={8} align="start" vertical className="p-16">
            {tokens.map((token) => (
              <TokenInfo
                key={token.symbol}
                isNative={token.isNative}
                symbol={token.symbol}
                totalRequiredInWei={token.totalRequiredInWei}
                currentBalanceInWei={token.currentBalanceInWei}
                decimals={token.decimals}
                precision={token.isNative ? 4 : 2}
              />
            ))}
          </Flex>
          <Divider className="m-0" />
          <DepositAddress />
        </>
      )}
    </RootCard>
  );
};
