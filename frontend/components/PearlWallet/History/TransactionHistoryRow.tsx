import { Flex, Tag, Typography } from 'antd';
import Image from 'next/image';
import { Fragment, useMemo } from 'react';
import { FiArrowUpRight } from 'react-icons/fi';
import styled from 'styled-components';

import { TokenSymbolConfigMap, TokenSymbolMap } from '@/config/tokens';
import { COLOR, EXPLORER_URL_BY_MIDDLEWARE_CHAIN } from '@/constants';
import { EvmChainId } from '@/constants/chains';
import { TransactionHistoryRow as TransactionHistoryRowType } from '@/types/TransactionHistory';
import { generateAgentName } from '@/utils/generateAgentName';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';
import { balanceFormat, formatUnitsToNumber } from '@/utils/numberFormatters';
import { truncateAddress } from '@/utils/truncate';

import { agentDisplayNameByAgentIds } from './agentByAgentId';
import { getTransactionRowLabel } from './labels';
import { resolveToken } from './tokenLookup';
import { TransactionRowIcon } from './TransactionRowIcon';
import { useAgentLookupBySafe } from './useAgentLookupBySafe';

const { Text } = Typography;

const RowContainer = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid ${COLOR.GRAY_3};

  &:last-child {
    border-bottom: none;
  }
`;

const TransfersGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr minmax(90px, max-content);
  column-gap: 24px;
  row-gap: 12px;
  justify-items: start;
  align-items: center;
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

const TimestampLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: inherit;
  &:hover {
    color: ${COLOR.PRIMARY};
    text-decoration: underline;
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

  // Prefer the locally-loaded service (gives the user's own nickname); fall
  // back to resolving the agent by its canonical agentId + deterministic
  // nickname from the serviceId, so any service resolves from subgraph data.
  const displayName =
    agent?.displayName ?? agentDisplayNameByAgentIds(row.agentIds);
  const nickname =
    agent?.nickname ??
    (chainId && row.serviceId
      ? generateAgentName(chainId, Number(row.serviceId))
      : null);

  const label = getTransactionRowLabel(row, displayName);

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
            {nickname ? <AgentTag>{nickname}</AgentTag> : null}
          </Flex>
          <Flex gap={4} align="center" className="text-xs">
            {explorerUrl ? (
              <TimestampLink
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-neutral-tertiary"
              >
                {formatTimestamp(row.blockTimestamp)}
                <FiArrowUpRight size={12} />
              </TimestampLink>
            ) : (
              <Text className="text-xs text-neutral-tertiary">
                {formatTimestamp(row.blockTimestamp)}
              </Text>
            )}
          </Flex>
        </Flex>
      </Flex>

      <TransfersGrid>
        {row.transfers.map((transfer, i) => {
          const tokenInfo = resolveToken(chainId, transfer.tokenAddress);
          // ETH amounts are often dust-sized (gas top-ups), where the default
          // 2-decimal rendering collapses to 0.00 — give ETH up to 6 decimals.
          const isEth = tokenInfo?.symbol === TokenSymbolMap.ETH;
          const amountNumber = formatUnitsToNumber(
            transfer.amount,
            tokenInfo?.decimals ?? 18,
            isEth ? 6 : 4,
          );
          const prefix = transfer.direction === 'in' ? '+' : '-';
          const className =
            transfer.direction === 'in'
              ? 'text-success-default'
              : 'text-neutral-primary';
          const symbol =
            tokenInfo?.symbol ??
            (transfer.tokenAddress
              ? truncateAddress(transfer.tokenAddress)
              : '—');
          const iconSrc = tokenInfo
            ? TokenSymbolConfigMap[tokenInfo.symbol]?.image
            : null;
          return (
            <Fragment key={i}>
              <Text className={`${className} text-base`}>
                {prefix}
                {balanceFormat(amountNumber, isEth ? 6 : 2)}
              </Text>
              <Flex align="center" gap={8}>
                {iconSrc ? (
                  <Image src={iconSrc} alt={symbol} width={20} height={20} />
                ) : null}
                <Text className="text-base text-neutral-primary">{symbol}</Text>
              </Flex>
            </Fragment>
          );
        })}
      </TransfersGrid>
    </RowContainer>
  );
};
