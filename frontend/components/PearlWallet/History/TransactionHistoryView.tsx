import { HistoryOutlined } from '@ant-design/icons';
import { Button, Flex, Spin, Typography } from 'antd';
import { ReactNode, useEffect, useState } from 'react';
import styled from 'styled-components';

import { Alert, CardFlex, InfoTooltip } from '@/components/ui';
import { COLOR } from '@/constants';
import { EvmChainId } from '@/constants/chains';
import {
  FundsCategory,
  TransactionHistoryRow as TransactionHistoryRowType,
} from '@/types/TransactionHistory';

import { TransactionHistoryRow } from './TransactionHistoryRow';

const { Text, Title } = Typography;

const EmptyState = styled(Flex).attrs({
  vertical: true,
  align: 'center',
  justify: 'center',
  gap: 8,
})`
  padding: 48px 24px;
  color: ${COLOR.TEXT_LIGHT};
`;

const CenteredPad = styled(Flex).attrs({
  justify: 'center',
  align: 'center',
})`
  padding: 32px 24px;
`;

const DataDelayAlert = styled(Alert)`
  .ant-alert-message {
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
  }
  .ant-alert-description {
    font-size: 14px;
    font-weight: 400;
    line-height: 20px;
  }
`;

// Rows are fetched up-front (see the *getAll* in each hook) and paged
// client-side: show PAGE_SIZE at a time, reveal more on demand.
const PAGE_SIZE = 10;

type TransactionHistoryViewProps = {
  chainId: EvmChainId | undefined;
  rows: TransactionHistoryRowType[];
  isFetched: boolean;
  isLoading: boolean;
  isError: boolean;
  isUnavailable: boolean;
  isDataDelayed: boolean;
  // Tooltip body next to the "Transaction History" heading.
  tooltip: ReactNode;
  // Icon for the "no records yet" empty state (default: history clock).
  emptyIcon?: ReactNode;
  // Changing this resets client-side paging (wallet chain / safe switched).
  resetKey?: string;
  // Per-row presentation overrides (see TransactionHistoryRow). The agent
  // wallet passes perspective-flipped labels + icons and hides the agent pill.
  getRowLabel?: (
    row: TransactionHistoryRowType,
    agentDisplayName: string | null,
  ) => string;
  getRowIconCategory?: (row: TransactionHistoryRowType) => FundsCategory;
  showAgentTag?: boolean;
};

/**
 * Presentational shell shared by the Pearl (master) and Agent transaction
 * histories. Owns the section header, card, stale-data alert, the
 * loading / unavailable / error / empty states, and client-side "Load more"
 * paging. Each wallet computes its rows via its own hook and feeds them in,
 * along with perspective-specific copy and per-row overrides.
 */
export const TransactionHistoryView = ({
  chainId,
  rows,
  isFetched,
  isLoading,
  isError,
  isUnavailable,
  isDataDelayed,
  tooltip,
  emptyIcon = <HistoryOutlined style={{ fontSize: 24 }} />,
  resetKey,
  getRowLabel,
  getRowIconCategory,
  showAgentTag,
}: TransactionHistoryViewProps) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [resetKey]);

  const visibleRows = rows.slice(0, visibleCount);
  const hasMore = rows.length > visibleCount;

  return (
    <Flex vertical gap={12}>
      <Flex align="center" gap={8}>
        <Title level={5} className="m-0 text-lg">
          Transaction History
        </Title>
        <InfoTooltip
          size="medium"
          styles={{ body: { padding: 12 } }}
          iconSize={18}
          iconColor={COLOR.BLACK}
        >
          {tooltip}
        </InfoTooltip>
      </Flex>
      <CardFlex $noBorder $padding="16px">
        {/* Notice that the subgraph is lagging the chain head (≥12h behind),
            so recent transactions may not be indexed yet. Gated on real lag so
            it clears on its own once indexing catches up; only shown alongside
            actual history — not in the loading / error / empty / unavailable
            states. */}
        {isFetched && rows.length > 0 && isDataDelayed ? (
          <DataDelayAlert
            type="warning"
            showIcon
            message="Recent transactions may not appear yet"
            description="Wallet operations work normally. This usually resolves on its own."
            className="mb-16"
          />
        ) : null}

        {isLoading && !isFetched ? (
          <CenteredPad>
            <Spin />
          </CenteredPad>
        ) : null}

        {isUnavailable ? (
          <EmptyState>
            <HistoryOutlined style={{ fontSize: 24 }} />
            <Text type="secondary">
              Transaction history is not available on this network yet.
            </Text>
          </EmptyState>
        ) : null}

        {isError ? (
          <CenteredPad>
            <Text type="secondary">Error loading transaction history.</Text>
          </CenteredPad>
        ) : null}

        {isFetched && !isError && rows.length === 0 ? (
          <EmptyState>
            {emptyIcon}
            <Text type="secondary">There are no transaction records yet.</Text>
          </EmptyState>
        ) : null}

        {isFetched && rows.length > 0 ? (
          <>
            {visibleRows.map((row) => (
              <TransactionHistoryRow
                key={row.id}
                row={row}
                chainId={chainId}
                getLabel={getRowLabel}
                iconCategory={getRowIconCategory?.(row)}
                showAgentTag={showAgentTag}
              />
            ))}
            {hasMore ? (
              <Flex justify="center" className="mt-8">
                <Button
                  type="link"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                >
                  Load more
                </Button>
              </Flex>
            ) : null}
          </>
        ) : null}
      </CardFlex>
    </Flex>
  );
};
