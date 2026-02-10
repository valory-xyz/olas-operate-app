import { CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Flex, TableColumnsType, Tag, Typography } from 'antd';
import { type TableLocale } from 'antd/es/table/interface';
import Image from 'next/image';
import styled from 'styled-components';

import { Table } from '@/components/ui';
import {
  CHAIN_IMAGE_MAP,
  COLOR,
  NA,
  SupportedMiddlewareChain,
} from '@/constants';
import { asEvmChainDetails, asEvmChainId, formatNumber } from '@/utils';

const LOCALE = {
  emptyText: 'No token requirements',
};

const { Text } = Typography;

const CustomTag = styled(Tag)<{ $isWaiting: boolean }>`
  color: ${({ $isWaiting }) =>
    $isWaiting ? COLOR.TEXT_NEUTRAL_TERTIARY : undefined};
  padding: 4px 10px;
  border-radius: 8px;
  border: none;
  line-height: 20px;
`;

export type TokenRequirementsRow = {
  totalAmount: number;
  pendingAmount: number;
  symbol: string;
  iconSrc: string;
  areFundsReceived: boolean;
  chainName?: SupportedMiddlewareChain;
};

const getColumns = (
  showChainColumn: boolean,
): TableColumnsType<TokenRequirementsRow> => {
  const baseColumns: TableColumnsType<TokenRequirementsRow> = [
    {
      title: 'Token',
      key: 'token',
      width: showChainColumn ? '20%' : '25%',
      render: (_: unknown, record: TokenRequirementsRow) => (
        <Flex align="center" gap={8}>
          <Image
            src={record.iconSrc}
            alt={record.symbol}
            width={20}
            height={20}
          />
          <Text>{record.symbol}</Text>
        </Flex>
      ),
    },
    {
      title: 'Total Amount Required',
      key: 'totalAmount',
      dataIndex: 'totalAmount',
      width: showChainColumn ? '30%' : '35%',
      render: (totalAmount: number) => <Text>{totalAmount}</Text>,
    },
    {
      title: 'Amount Pending',
      key: 'pendingAmount',
      width: showChainColumn ? '30%' : '35%',
      render: (_: unknown, record: TokenRequirementsRow) => {
        const isWaiting = !record.areFundsReceived;
        return (
          <CustomTag
            $isWaiting={isWaiting}
            color={isWaiting ? undefined : COLOR.SUCCESS}
            icon={isWaiting ? <ClockCircleOutlined /> : <CheckCircleOutlined />}
          >
            {record.areFundsReceived
              ? 'No pending amount'
              : `Pending ${formatNumber(record.pendingAmount, 4)}`}
          </CustomTag>
        );
      },
    },
  ];

  // Optionally add the Chain column at the start
  if (showChainColumn) {
    baseColumns.unshift({
      title: 'Chain',
      key: 'chain',
      dataIndex: 'chainName',
      width: '20%',
      render: (chainName: SupportedMiddlewareChain) => {
        const chainId = asEvmChainId(chainName);
        const chainImageSrc = chainId ? CHAIN_IMAGE_MAP[chainId] : undefined;
        if (!chainImageSrc) return NA;

        const chainDisplayName = asEvmChainDetails(chainName).displayName;

        return (
          <Flex align="center" gap={8}>
            <Image
              src={chainImageSrc}
              alt={chainDisplayName || 'Chain'}
              width={20}
              height={20}
            />
            <Text>{chainDisplayName}</Text>
          </Flex>
        );
      },
    });
  }

  return baseColumns;
};

type TokenRequirementsTableProps = {
  isLoading?: boolean;
  tokensDataSource: TokenRequirementsRow[];
  locale?: TableLocale;
  showChainColumn?: boolean;
  className?: string;
};

export const TokenRequirementsTable = ({
  isLoading,
  tokensDataSource,
  locale = LOCALE,
  showChainColumn = false,
  className,
}: TokenRequirementsTableProps) => (
  <Table<TokenRequirementsRow>
    dataSource={isLoading ? [] : tokensDataSource}
    columns={getColumns(showChainColumn)}
    loading={isLoading}
    pagination={false}
    locale={locale}
    className={className}
    rowKey={(record) => record.symbol}
  />
);
