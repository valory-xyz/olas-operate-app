import { Flex, TableColumnsType, Typography } from 'antd';
import Image from 'next/image';

import { Table } from '@/components/ui';
import { TokenSymbolConfigMap } from '@/config/tokens';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { AvailableAsset } from '@/types/Wallet';
import { formatNumber } from '@/utils';

const { Text } = Typography;

const columns: TableColumnsType<AvailableAsset> = [
  {
    title: 'Token',
    key: 'token',
    render: (_: unknown, record: AvailableAsset) => (
      <Flex align="center" gap={8}>
        <Image
          src={TokenSymbolConfigMap[record.symbol].image}
          alt={record.symbol}
          width={20}
          height={20}
        />
        <Text>{record.symbol}</Text>
      </Flex>
    ),
    width: '50%',
  },
  {
    title: 'Amount',
    key: 'amount',
    render: (_: unknown, record: AvailableAsset) => (
      <Text>{formatNumber(record.amount, 4)}</Text>
    ),
    width: '50%',
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
