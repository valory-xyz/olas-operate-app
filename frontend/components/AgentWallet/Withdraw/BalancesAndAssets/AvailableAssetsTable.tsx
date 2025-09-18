import { Flex, Image as AntdImage, TableColumnsType, Typography } from 'antd';

import { Table } from '@/components/ui/Table';
import { TokenSymbolConfigMap } from '@/constants/token';
import { formatNumber } from '@/utils/numberFormatters';

import { usePearlWallet } from '../../AgentWalletContext';
import { AvailableAsset } from '../types';

const { Text } = Typography;

const columns: TableColumnsType<AvailableAsset> = [
  {
    title: 'Token',
    key: 'token',
    render: (_: unknown, record: AvailableAsset) => (
      <Flex align="center" gap={8}>
        <AntdImage
          width={20}
          src={TokenSymbolConfigMap[record.symbol].image}
          alt={record.symbol}
          preview={false}
          className="flex"
        />
        <Text>{record.symbol}</Text>
      </Flex>
    ),
    width: '30%',
  },
  {
    title: 'Amount',
    key: 'amount',
    render: (_: unknown, record: AvailableAsset) => (
      <Text>{formatNumber(record.amount, 4)}</Text>
    ),
    align: 'right',
    width: '30%',
  },
  {
    title: 'Value',
    key: 'value',
    render: (_: unknown, record: AvailableAsset) => (
      <Text>${formatNumber(record.valueInUsd)}</Text>
    ),
    align: 'right',
    width: '40%',
  },
];

export const AvailableAssetsTable = () => {
  const { isLoading, availableAssets } = usePearlWallet();

  return (
    <Table<AvailableAsset>
      loading={isLoading}
      dataSource={availableAssets}
      columns={columns}
      rowKey={(record) => record.symbol}
      pagination={false}
      rowHoverable={false}
      locale={{ emptyText: 'No available assets' }}
    />
  );
};
