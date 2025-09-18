import { Flex, Image as AntdImage, TableColumnsType, Typography } from 'antd';

import { Table } from '@/components/ui/Table';
import { TokenSymbolConfigMap } from '@/constants/token';
import { formatNumber } from '@/utils/numberFormatters';

import { usePearlWallet } from '../../AgentWalletContext';
import { TransactionHistory } from '../types';

const { Text } = Typography;

const columns: TableColumnsType<TransactionHistory> = [
  {
    title: 'Token',
    key: 'token',
    render: (_: unknown, record: TransactionHistory) => (
      <Flex align="center" gap={8}>
        <AntdImage
          width={20}
          src={TokenSymbolConfigMap[record.symbol].image}
          alt={record.symbol}
          style={{ display: 'flex' }}
        />
        <Text>{record.symbol}</Text>
      </Flex>
    ),
    width: '35%',
  },
  {
    title: 'Amount',
    key: 'amount',
    render: (_: unknown, record: TransactionHistory) => (
      <Flex vertical>
        <Text>{record.amount}</Text>
        <Text type="secondary" className="text-sm">
          (${formatNumber(record.amount)})
        </Text>
      </Flex>
    ),
    width: '25%',
    align: 'right',
  },
];

export const TransactionHistoryTable = () => {
  const { isLoading, transactionHistory } = usePearlWallet();

  return (
    <Table<TransactionHistory>
      loading={isLoading}
      dataSource={transactionHistory}
      columns={columns}
      rowKey={(record) => record.symbol}
      pagination={false}
      rowHoverable={false}
      locale={{ emptyText: 'No available transactions' }}
    />
  );
};
