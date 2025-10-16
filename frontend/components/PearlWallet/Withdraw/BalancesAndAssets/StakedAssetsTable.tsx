import { Flex, Image as AntdImage, TableColumnsType, Typography } from 'antd';

import { Table } from '@/components/ui/Table';
import { NA } from '@/constants/symbols';
import { TokenSymbolConfigMap } from '@/constants/token';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { StakedAsset } from '@/types/Wallet';

const { Text } = Typography;

const columns: TableColumnsType<StakedAsset> = [
  {
    title: 'Agent',
    key: 'agent',
    render: (_: unknown, record: StakedAsset) => (
      <Flex align="center" gap={8}>
        {record.agentImgSrc && (
          <AntdImage
            width={28}
            src={record.agentImgSrc}
            alt={record.symbol}
            style={{ display: 'flex' }}
          />
        )}
        <Text>{record.agentName || NA}</Text>
      </Flex>
    ),
    width: '40%',
  },
  {
    title: 'Token',
    key: 'token',
    render: (_: unknown, record: StakedAsset) => (
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
    render: (_: unknown, record: StakedAsset) => (
      <Flex vertical>
        <Text>{record.amount}</Text>
      </Flex>
    ),
    width: '25%',
    align: 'right',
  },
];

export const StakedAssetsTable = () => {
  const { isLoading, stakedAssets } = usePearlWallet();

  return (
    <Table<StakedAsset>
      loading={isLoading}
      dataSource={stakedAssets}
      columns={columns}
      rowKey={(record) => record.symbol}
      pagination={false}
      rowHoverable={false}
      locale={{ emptyText: 'No available assets' }}
      className="mb-8"
    />
  );
};
