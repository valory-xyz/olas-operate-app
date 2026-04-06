import { Alert, Button, Flex, Input, Tag, Typography } from 'antd';
import Image from 'next/image';
import { ChangeEvent, useCallback, useMemo } from 'react';
import styled from 'styled-components';

import {
  CHAIN_IMAGE_MAP,
  EvmChainIdMap,
  EvmChainName,
} from '@/constants/chains';
import {
  ChainAmounts,
  FundRecoveryScanResponse,
} from '@/types/FundRecovery';

const { Title, Text } = Typography;

const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

const isValidEvmAddress = (address: string): boolean =>
  EVM_ADDRESS_REGEX.test(address);

const ChainCard = styled(Flex)`
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 16px;
  background: #fafafa;
`;

type ChainBalance = {
  chainId: number;
  chainName: string;
  chainImage: string;
  tokens: { symbol: string; amount: string }[];
  hasInsufficientGas: boolean;
};

const aggregateChainBalances = (
  balances: ChainAmounts,
  gasWarning: Record<string, { insufficient: boolean }>,
): ChainBalance[] => {
  const result: ChainBalance[] = [];

  for (const [chainIdStr, addressMap] of Object.entries(balances)) {
    const chainId = Number(chainIdStr);
    const chainName =
      EvmChainName[chainId as keyof typeof EvmChainName] ?? `Chain ${chainId}`;
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

    const tokens = Object.entries(tokenAggregates)
      .filter(([, amount]) => amount > 0n)
      .map(([symbol, amount]) => ({
        symbol: symbol.startsWith('0x')
          ? `${symbol.slice(0, 6)}...${symbol.slice(-4)}`
          : symbol,
        amount: amount.toString(),
      }));

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

type ChainBalanceCardProps = {
  chain: ChainBalance;
};

const ChainBalanceCard = ({ chain }: ChainBalanceCardProps) => (
  <ChainCard vertical gap={12}>
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
        <Tag key={token.symbol} color="blue">
          {token.amount} {token.symbol}
        </Tag>
      ))}
    </Flex>

    {chain.hasInsufficientGas && (
      <Alert
        type="warning"
        showIcon
        message={`Insufficient gas on ${chain.chainName}. Top up native token before withdrawing.`}
        style={{ fontSize: 12 }}
      />
    )}
  </ChainCard>
);

type FundRecoveryScanResultsProps = {
  scanResult: FundRecoveryScanResponse;
  destinationAddress: string;
  isExecuting: boolean;
  onDestinationAddressChange: (address: string) => void;
  onRecover: () => void;
};

export const FundRecoveryScanResults = ({
  scanResult,
  destinationAddress,
  isExecuting,
  onDestinationAddressChange,
  onRecover,
}: FundRecoveryScanResultsProps) => {
  const chainBalances = useMemo(
    () => aggregateChainBalances(scanResult.balances, scanResult.gas_warning),
    [scanResult.balances, scanResult.gas_warning],
  );

  const hasInsufficientGas = chainBalances.some((c) => c.hasInsufficientGas);
  const hasBalances = chainBalances.length > 0;

  const isAddressValid = isValidEvmAddress(destinationAddress);
  const canWithdraw =
    hasBalances && isAddressValid && !hasInsufficientGas && !isExecuting;

  const handleAddressChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onDestinationAddressChange(e.target.value);
    },
    [onDestinationAddressChange],
  );

  return (
    <Flex vertical gap={24}>
      <Flex vertical gap={8}>
        <Title level={4} className="m-0">
          Recoverable Balances
        </Title>
        <Text type="secondary">
          Balances found across supported chains for your recovery phrase.
        </Text>
      </Flex>

      {hasBalances ? (
        <Flex vertical gap={8}>
          {chainBalances.map((chain) => (
            <ChainBalanceCard key={chain.chainId} chain={chain} />
          ))}
        </Flex>
      ) : (
        <Alert
          type="info"
          showIcon
          message="No recoverable balances found"
          description="There are no non-zero balances associated with this recovery phrase."
        />
      )}

      <Flex vertical gap={8}>
        <Text strong>
          Withdrawal address <Text type="danger">*</Text>
        </Text>
        <Input
          value={destinationAddress}
          onChange={handleAddressChange}
          placeholder="0x..."
          size="large"
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

      <Text type="secondary" style={{ fontSize: 12 }}>
        By proceeding, all recoverable funds will be sent to the address above.
        This action cannot be undone.
      </Text>

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
