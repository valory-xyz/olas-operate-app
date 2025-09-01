import { CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import {
  Flex,
  Image as AntdImage,
  TableColumnsType,
  Tag,
  Typography,
} from 'antd';
import styled from 'styled-components';

import { Table } from '@/components/ui/Table';
import { COLOR } from '@/constants/colors';

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
  status: string;
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
    key: 'status',
    render: (_: unknown, record: TokenRowData) => {
      const isWaiting = record.status === 'Waiting';
      return (
        <CustomTag
          $isWaiting={isWaiting}
          color={isWaiting ? undefined : COLOR.SUCCESS}
          icon={isWaiting ? <ClockCircleOutlined /> : <CheckCircleOutlined />}
        >
          {record.status}
        </CustomTag>
      );
    },
  },
];

export const TokenRequirementsTable = ({
  isLoading,
  tableData,
}: {
  isLoading: boolean;
  tableData: TokenRowData[];
}) => {
  if (!isLoading && tableData.length === 0) return null;

  return (
    <Table
      dataSource={tableData}
      columns={columns}
      loading={isLoading}
      pagination={false}
    />
  );
};
