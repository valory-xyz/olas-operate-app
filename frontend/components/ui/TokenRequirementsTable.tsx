import { CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import {
  Flex,
  Image as AntdImage,
  TableColumnsType,
  Tag,
  Typography,
} from 'antd';
import { type TableLocale } from 'antd/es/table/interface';
import styled from 'styled-components';

import { Table } from '@/components/ui/Table';
import { COLOR } from '@/constants/colors';

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
  amount: number;
  symbol: string;
  iconSrc: string;
  areFundsReceived: boolean;
};

const columns: TableColumnsType = [
  {
    title: 'Token',
    key: 'token',
    render: (_: unknown, record: TokenRowData) => (
      <Flex align="center" gap={8}>
        <AntdImage
          width={20}
          src={record.iconSrc}
          alt={record.symbol}
          style={{ display: 'flex' }}
        />
        <Text>{record.symbol}</Text>
      </Flex>
    ),
  },
  {
    title: 'Amount',
    key: 'amount',
    render: (_: unknown, record: TokenRowData) => <Text>{record.amount}</Text>,
  },
  {
    title: 'Status',
    key: 'token',
    render: (_: unknown, record: TokenRowData) => {
      const isWaiting = !record.areFundsReceived;
      return (
        <CustomTag
          $isWaiting={isWaiting}
          color={isWaiting ? undefined : COLOR.SUCCESS}
          icon={isWaiting ? <ClockCircleOutlined /> : <CheckCircleOutlined />}
        >
          {record.areFundsReceived ? 'Received' : 'Waiting'}
        </CustomTag>
      );
    },
  },
];

export const TokenRequirementsTable = ({
  isLoading,
  tableData,
  locale = LOCALE,
}: {
  isLoading: boolean;
  tableData: TokenRowData[];
  locale?: TableLocale;
}) => {
  return (
    <Table
      dataSource={tableData}
      columns={columns}
      loading={isLoading}
      pagination={false}
      locale={locale}
      className="mt-32"
    />
  );
};
