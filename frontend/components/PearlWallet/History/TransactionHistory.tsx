import { HistoryOutlined } from '@ant-design/icons';
import { Flex, Spin, Typography } from 'antd';
import styled from 'styled-components';

import { Alert, CardFlex, InfoTooltip } from '@/components/ui';
import { COLOR } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { useTransactionHistory } from '@/hooks/useTransactionHistory';
import { FUNDS_CATEGORY } from '@/types/TransactionHistory';

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

const HistoryFloorDivider = styled(Flex).attrs({ align: 'center', gap: 8 })`
  padding: 12px 0;
  color: ${COLOR.TEXT_NEUTRAL_TERTIARY};
  font-size: 12px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${COLOR.GRAY_3};
  }
`;

export const TransactionHistory = () => {
  const { walletChainId, masterSafeAddress } = usePearlWallet();
  const chainId = walletChainId ?? undefined;
  const { rows, meta, isFetched, isLoading, isError } = useTransactionHistory({
    chainId,
    masterSafe: masterSafeAddress ?? undefined,
  });

  // Don't render the section pre-Safe — VLOP-73 acceptance criterion.
  if (!masterSafeAddress) return null;

  const isStale = meta?.hasIndexingErrors ?? false;

  return (
    <Flex vertical gap={12}>
      <SectionHeader />
      <CardFlex $noBorder $padding="16px">
        {isStale ? (
          <Alert
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

        {isFetched && rows.length > 0
          ? (() => {
              // Find the boundary between live tx rows and the OPENING_BALANCE
              // snapshot rows at the bottom of the chronological list — render
              // a "History starts here" divider in between.
              const firstOpeningBalanceIndex = rows.findIndex(
                (r) => r.category === FUNDS_CATEGORY.OPENING_BALANCE,
              );
              return rows.map((row, i) => (
                <span key={row.id}>
                  {i === firstOpeningBalanceIndex &&
                  firstOpeningBalanceIndex > 0 ? (
                    <HistoryFloorDivider>
                      History starts here
                    </HistoryFloorDivider>
                  ) : null}
                  <TransactionHistoryRow row={row} chainId={chainId} />
                </span>
              ));
            })()
          : null}
      </CardFlex>
    </Flex>
  );
};
