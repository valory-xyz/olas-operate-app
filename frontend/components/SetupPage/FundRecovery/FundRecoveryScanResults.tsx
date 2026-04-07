import { WarningOutlined } from '@ant-design/icons';
import { Button, Flex, Input, Tag, Typography } from 'antd';
import Image from 'next/image';
import { ChangeEvent, useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { Alert } from '@/components/ui';
import { CHAIN_CONFIG } from '@/config/chains';
import { TOKEN_CONFIG, TokenSymbolConfigMap } from '@/config/tokens';
import { AddressZero, CHAIN_IMAGE_MAP, COLOR, EvmChainName } from '@/constants';
import { Address } from '@/types';
import { ChainAmounts, FundRecoveryScanResponse } from '@/types/FundRecovery';
import {
  areAddressesEqual,
  formatUnitsToNumber,
  truncateAddress,
} from '@/utils';

const { Title, Text } = Typography;

const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

const isValidEvmAddress = (address: string): boolean =>
  EVM_ADDRESS_REGEX.test(address);

const ChainRow = styled(Flex)`
  padding: 12px 0;
  & + & {
    border-top: 1px solid ${COLOR.BORDER_LIGHT};
  }
`;

type TokenBalance = { symbol: string; amount: string; icon?: string };

type ChainBalance = {
  chainId: number;
  chainName: string;
  chainImage: string;
  tokens: TokenBalance[];
  hasInsufficientGas: boolean;
};

const aggregateChainBalances = (
  balances: ChainAmounts,
  gasWarning: Record<string, { insufficient: boolean }>,
): ChainBalance[] => {
  const result: ChainBalance[] = [];

  for (const [chainIdStr, addressMap] of Object.entries(balances)) {
    const chainId = Number(chainIdStr);
    const chainBaseName =
      EvmChainName[chainId as keyof typeof EvmChainName] ?? `Chain ${chainId}`;
    const chainName = chainBaseName.endsWith(' Chain')
      ? chainBaseName
      : `${chainBaseName} Chain`;
    const chainImage =
      CHAIN_IMAGE_MAP[chainId as keyof typeof CHAIN_IMAGE_MAP] ?? '';

    // Aggregate token amounts across all addresses (Master EOA + Master Safe)
    const tokenAggregates: Record<string, bigint> = {};
    for (const tokenMap of Object.values(addressMap)) {
      for (const [token, amountStr] of Object.entries(tokenMap)) {
        const current = tokenAggregates[token] ?? 0n;
        try {
          tokenAggregates[token] = current + BigInt(amountStr);
        } catch {
          // skip unparseable amounts
        }
      }
    }

    const tokens: TokenBalance[] = [];
    for (const [tokenAddress, amount] of Object.entries(tokenAggregates)) {
      if (amount <= 0n) continue;

      let symbol: string | undefined;
      let decimals: number = 18;

      if (tokenAddress === AddressZero) {
        // Native token
        const nativeToken =
          CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG]?.nativeToken;
        symbol = nativeToken?.symbol;
        decimals = nativeToken?.decimals ?? 18;
      } else {
        // ERC-20 token — search TOKEN_CONFIG for matching address
        const chainTokens = TOKEN_CONFIG[chainId as keyof typeof TOKEN_CONFIG];
        if (chainTokens) {
          const tokenConfig = Object.values(chainTokens).find(
            (t) => t && areAddressesEqual(t.address, tokenAddress as Address),
          );
          if (tokenConfig) {
            symbol = tokenConfig.symbol;
            decimals = tokenConfig.decimals;
          }
        }
      }

      // Fallback: show truncated address if symbol not found
      const displaySymbol = symbol ?? truncateAddress(tokenAddress as Address);

      const icon = symbol
        ? TokenSymbolConfigMap[symbol as keyof typeof TokenSymbolConfigMap]
            ?.image
        : undefined;

      const formattedAmount = formatUnitsToNumber(amount, decimals);

      tokens.push({
        symbol: displaySymbol,
        amount: formattedAmount.toString(),
        icon,
      });
    }

    // Skip chains with no positive balances
    if (tokens.length === 0) continue;

    result.push({
      chainId,
      chainName,
      chainImage,
      tokens,
      hasInsufficientGas: gasWarning[chainIdStr]?.insufficient === true,
    });
  }

  return result;
};

type ChainBalanceRowProps = {
  chain: ChainBalance;
};

const ChainBalanceRow = ({ chain }: ChainBalanceRowProps) => (
  <ChainRow vertical gap={12}>
    <Flex align="center" gap={8}>
      {chain.chainImage && (
        <Image
          src={chain.chainImage}
          alt={chain.chainName}
          width={20}
          height={20}
          style={{ borderRadius: '50%' }}
        />
      )}
      <Text strong>{chain.chainName}</Text>
    </Flex>

    <Flex wrap="wrap" gap={6}>
      {chain.tokens.map((token) => (
        <Tag
          key={token.symbol}
          style={{
            backgroundColor: COLOR.WHITE,
            border: `1px solid ${COLOR.BORDER_LIGHT}`,
          }}
        >
          {token.icon && (
            <Image
              src={token.icon}
              alt={token.symbol}
              width={12}
              height={12}
              style={{ borderRadius: '50%', marginRight: 4 }}
            />
          )}
          {token.amount} {token.symbol}
        </Tag>
      ))}
    </Flex>

    {chain.hasInsufficientGas && (
      <Alert
        type="warning"
        showIcon
        message={
          <span className="text-sm">
            Insufficient gas on {chain.chainName}. Top up native token before
            withdrawing.
          </span>
        }
      />
    )}
  </ChainRow>
);

type FundRecoveryChainBalancesProps = {
  scanResult: FundRecoveryScanResponse;
};

export const FundRecoveryChainBalances = ({
  scanResult,
}: FundRecoveryChainBalancesProps) => {
  const chainBalances = useMemo(
    () => aggregateChainBalances(scanResult.balances, scanResult.gas_warning),
    [scanResult.balances, scanResult.gas_warning],
  );

  const hasBalances = chainBalances.length > 0;

  return (
    <Flex vertical gap={24}>
      <Flex vertical gap={8}>
        <Title level={3} className="m-0">
          Withdraw Funds
        </Title>
        <Text type="secondary">
          The following funds are available for withdrawal.
        </Text>
      </Flex>

      {hasBalances ? (
        <Flex vertical gap={8}>
          {chainBalances.map((chain) => (
            <ChainBalanceRow key={chain.chainId} chain={chain} />
          ))}
        </Flex>
      ) : (
        <Alert
          type="info"
          showIcon
          message={
            <span className="text-sm">
              No recoverable balances found. There are no non-zero balances
              associated with this recovery phrase.
            </span>
          }
        />
      )}

      <Flex gap={8} align="start">
        <WarningOutlined style={{ marginTop: 3 }} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Funds locked in external protocols and small amounts held in your
          agent&apos;s transaction signing wallet are not included in this
          withdrawal.
        </Text>
      </Flex>
    </Flex>
  );
};

type FundRecoveryWithdrawFormProps = {
  scanResult: FundRecoveryScanResponse;
  destinationAddress: string;
  isExecuting: boolean;
  onDestinationAddressChange: (address: string) => void;
  onRecover: () => void;
};

export const FundRecoveryWithdrawForm = ({
  scanResult,
  destinationAddress,
  isExecuting,
  onDestinationAddressChange,
  onRecover,
}: FundRecoveryWithdrawFormProps) => {
  const chainBalances = useMemo(
    () => aggregateChainBalances(scanResult.balances, scanResult.gas_warning),
    [scanResult.balances, scanResult.gas_warning],
  );

  const hasBalances = chainBalances.length > 0;

  const isAddressValid = isValidEvmAddress(destinationAddress);
  const canWithdraw = hasBalances && isAddressValid && !isExecuting;

  const handleAddressChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onDestinationAddressChange(e.target.value);
    },
    [onDestinationAddressChange],
  );

  return (
    <Flex vertical gap={16}>
      <Flex vertical gap={8}>
        <Text strong>
          Withdrawal address <Text type="danger">*</Text>
        </Text>
        <Input
          value={destinationAddress}
          onChange={handleAddressChange}
          placeholder="0x..."
          status={destinationAddress && !isAddressValid ? 'error' : undefined}
        />
        {destinationAddress && !isAddressValid && (
          <Text type="danger" style={{ fontSize: 12 }}>
            Please enter a valid EVM address (0x followed by 40 hex characters)
          </Text>
        )}
        <Text type="secondary" style={{ fontSize: 12 }}>
          Ensure this is an EVM-compatible address you can access on all
          relevant chains. ENS names aren&apos;t supported.
        </Text>
      </Flex>

      <Button
        type="primary"
        size="large"
        block
        disabled={!canWithdraw}
        loading={isExecuting}
        onClick={onRecover}
      >
        Withdraw
      </Button>
    </Flex>
  );
};

