import { Flex, Tag, Typography } from 'antd';
import Image from 'next/image';
import { useMemo } from 'react';
import styled from 'styled-components';

import { TokenSymbolConfigMap } from '@/config/tokens';
import {
  COLOR,
  EXPLORER_URL_BY_MIDDLEWARE_CHAIN,
  UNICODE_SYMBOLS,
} from '@/constants';
import { EvmChainId } from '@/constants/chains';
import { Address } from '@/types/Address';
import { TransactionHistoryRow as TransactionHistoryRowType } from '@/types/TransactionHistory';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';
import { balanceFormat, formatUnitsToNumber } from '@/utils/numberFormatters';
import { truncateAddress } from '@/utils/truncate';

import { getTransactionRowLabel } from './labels';
import { resolveToken } from './tokenLookup';
import { TransactionRowIcon } from './TransactionRowIcon';
import { useAgentLookupBySafe } from './useAgentLookupBySafe';

const { Text } = Typography;

const RowContainer = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 24px;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid ${COLOR.GRAY_3};

  &:last-child {
    border-bottom: none;
  }
`;

const AmountColumn = styled(Flex).attrs({ vertical: true, align: 'flex-end' })`
  gap: 12px;
  padding: 2px 0;
`;

const SymbolColumn = styled(Flex).attrs({ vertical: true })`
  gap: 12px;
  padding: 2px 0;
`;

const AgentTag = styled(Tag)`
  background: ${COLOR.PURPLE_LIGHT_3};
  color: ${COLOR.PURPLE};
  border: none;
  margin: 0;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 14px;
  line-height: 20px;
`;

const TxHashLink = styled.a`
  color: ${COLOR.PRIMARY};
  &:hover {
    color: ${COLOR.PURPLE_DARK};
  }
`;

const formatTimestamp = (unixSeconds: number): string => {
  if (!unixSeconds) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(unixSeconds * 1000));
};

type TransactionHistoryRowProps = {
  row: TransactionHistoryRowType;
  chainId: EvmChainId | undefined;
};

export const TransactionHistoryRow = ({
  row,
  chainId,
}: TransactionHistoryRowProps) => {
  const lookupAgent = useAgentLookupBySafe();
  const agent = useMemo(
    () => lookupAgent(row.agentSafeAddress),
    [lookupAgent, row.agentSafeAddress],
  );

  const label = getTransactionRowLabel(row, agent?.displayName ?? null);

  const explorerUrl = chainId
    ? `${EXPLORER_URL_BY_MIDDLEWARE_CHAIN[asMiddlewareChain(chainId)]}/tx/${row.transactionHash}`
    : null;

  return (
    <RowContainer>
      <Flex gap={12} align="flex-start">
        <TransactionRowIcon category={row.category} />
        <Flex vertical gap={2} style={{ minWidth: 0 }}>
          <Flex gap={12} align="center" wrap="wrap" style={{ minHeight: 28 }}>
            <Text className="text-base text-neutral-primary">{label}</Text>
            {agent?.nickname ? <AgentTag>{agent.nickname}</AgentTag> : null}
          </Flex>
          <Flex gap={4} align="center" className="text-xs">
            <Text className="text-xs text-neutral-tertiary">
              {formatTimestamp(row.blockTimestamp)}
            </Text>
            {explorerUrl ? (
              <>
                <Text className="text-xs text-neutral-tertiary">·</Text>
                <TxHashLink
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs"
                >
                  {truncateAddress(row.transactionHash as Address)}{' '}
                  {UNICODE_SYMBOLS.EXTERNAL_LINK}
                </TxHashLink>
              </>
            ) : null}
          </Flex>
        </Flex>
      </Flex>

      <AmountColumn>
        {row.transfers.map((transfer, i) => {
          const tokenInfo = resolveToken(chainId, transfer.tokenAddress);
          const amountNumber = formatUnitsToNumber(
            transfer.amount,
            tokenInfo?.decimals ?? 18,
          );
          const prefix = transfer.direction === 'in' ? '+' : '-';
          const className =
            transfer.direction === 'in'
              ? 'text-success-default'
              : 'text-neutral-primary';
          return (
            <Text key={i} className={`${className} text-base`}>
              {prefix}
              {balanceFormat(amountNumber, 2)}
            </Text>
          );
        })}
      </AmountColumn>

      <SymbolColumn>
        {row.transfers.map((transfer, i) => {
          const tokenInfo = resolveToken(chainId, transfer.tokenAddress);
          const symbol =
            tokenInfo?.symbol ??
            (transfer.tokenAddress
              ? truncateAddress(transfer.tokenAddress)
              : '—');
          const iconSrc = tokenInfo
            ? TokenSymbolConfigMap[tokenInfo.symbol]?.image
            : null;
          return (
            <Flex key={i} align="center" gap={8}>
              {iconSrc ? (
                <Image src={iconSrc} alt={symbol} width={20} height={20} />
              ) : null}
              <Text className="text-base text-neutral-primary">{symbol}</Text>
            </Flex>
          );
        })}
      </SymbolColumn>
    </RowContainer>
  );
};
