import { HistoryOutlined } from '@ant-design/icons';
import { Button, Flex, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import styled from 'styled-components';

import { Alert, CardFlex, InfoTooltip } from '@/components/ui';
import { COLOR } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { useTransactionHistory } from '@/hooks/useTransactionHistory';

import { TransactionHistoryRow } from './TransactionHistoryRow';

const { Text, Title } = Typography;

const SectionHeader = () => (
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
      Recent activity for your Pearl Wallet on this chain.
    </InfoTooltip>
  </Flex>
);

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

// Rows are fetched up-front (see useTransactionHistory.getAll) and paged
// client-side: show PAGE_SIZE at a time, reveal more on demand.
const PAGE_SIZE = 10;

export const TransactionHistory = () => {
  const { walletChainId, masterSafeAddress } = usePearlWallet();

  const chainId = walletChainId ?? undefined;
  const { rows, isFetched, isLoading, isError, isUnavailable } =
    useTransactionHistory({
      chainId,
      masterSafe: masterSafeAddress ?? undefined,
    });

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Reset paging back to the first page when the wallet (chain / safe) changes.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [chainId, masterSafeAddress]);

  // Don't render the section pre-Safe — VLOP-73 acceptance criterion.
  if (!masterSafeAddress) return null;

  const visibleRows = rows.slice(0, visibleCount);
  const hasMore = rows.length > visibleCount;

  return (
    <Flex vertical gap={12}>
      <SectionHeader />
      <CardFlex $noBorder $padding="16px">
        {/* Standing notice that the subgraph can lag the chain head, so recent
            transactions may not be indexed yet. Only shown alongside actual
            history — not in the loading / error / empty / unavailable states. */}
        {isFetched && rows.length > 0 ? (
          <DataDelayAlert
            type="warning"
            showIcon
            message="Recent transactions may not appear yet"
            description="Wallet operations work normally. This usually resolves on its own."
            style={{ marginBottom: 16 }}
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
            <HistoryOutlined style={{ fontSize: 24 }} />
            <Text type="secondary">There are no transaction records yet.</Text>
          </EmptyState>
        ) : null}

        {isFetched && rows.length > 0 ? (
          <>
            {visibleRows.map((row) => (
              <TransactionHistoryRow key={row.id} row={row} chainId={chainId} />
            ))}
            {hasMore ? (
              <Flex justify="center" style={{ marginTop: 8 }}>
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
