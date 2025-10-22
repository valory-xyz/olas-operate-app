import { CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Flex, TableColumnsType, Tag, Typography } from 'antd';
import { type TableLocale } from 'antd/es/table/interface';
import Image from 'next/image';
import styled from 'styled-components';

import { Table } from '@/components/ui/Table';
import { COLOR } from '@/constants/colors';
import { formatNumber } from '@/utils';

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

type TokenRowData = {
  totalAmount: number;
  pendingAmount: number;
  symbol: string;
  iconSrc: string;
  areFundsReceived: boolean;
};

const columns: TableColumnsType<TokenRowData> = [
  {
    title: 'Token',
    key: 'token',
    width: '25%',
    render: (_: unknown, record: TokenRowData) => (
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
    width: '35%',
    render: (_: unknown, record: TokenRowData) => (
      <Text>{record.totalAmount}</Text>
    ),
  },
  {
    title: 'Amount Pending',
    key: 'pendingAmount',
    width: '35%',
    render: (_: unknown, record: TokenRowData) => {
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
] as const;

type TokenRequirementsTableProps = {
  isLoading?: boolean;
  tokensDataSource: TokenRowData[];
  locale?: TableLocale;
};

export const TokenRequirementsTable = ({
  isLoading,
  tokensDataSource,
  locale = LOCALE,
}: TokenRequirementsTableProps) => (
  <Table<TokenRowData>
    dataSource={isLoading ? [] : tokensDataSource}
    columns={columns}
    loading={isLoading}
    pagination={false}
    locale={locale}
    className="mt-32"
    rowKey={(record) => record.symbol}
  />
);
