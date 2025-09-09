import { Flex, Image as AntdImage, TableColumnsType, Typography } from 'antd';

import { Table } from '@/components/ui/Table';
import { NA } from '@/constants/symbols';
import { TokenSymbol, TokenSymbolConfigMapV2 } from '@/constants/token';
import { Nullable } from '@/types/Util';

const { Text } = Typography;

type StakedAssetRow = {
  agentName: Nullable<string>;
  agentImgSrc: Nullable<string>;
  symbol: TokenSymbol;
  amount: number;
  value: number;
};

const columns: TableColumnsType<StakedAssetRow> = [
  {
    title: 'Agent',
    key: 'agent',
    render: (_: unknown, record: StakedAssetRow) => (
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
    render: (_: unknown, record: StakedAssetRow) => (
      <Flex align="center" gap={8}>
        <AntdImage
          width={20}
          src={TokenSymbolConfigMapV2[record.symbol].image}
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
    render: (_: unknown, record: StakedAssetRow) => (
      <Flex vertical>
        <Text>${record.amount}</Text>
        <Text type="secondary" className="text-sm">
          (${record.value})
        </Text>
      </Flex>
    ),
    width: '25%',
    align: 'right',
  },
];

type StakedAssetsTableProps = {
  isLoading: boolean;
  tableData: StakedAssetRow[];
};

export const StakedAssetsTable = ({
  isLoading,
  tableData,
}: StakedAssetsTableProps) => {
  return (
    <Table<StakedAssetRow>
      loading={isLoading}
      dataSource={tableData}
      columns={columns}
      rowKey={(record) => record.symbol}
      pagination={false}
      rowHoverable={false}
      locale={{ emptyText: 'No available assets' }}
    />
  );
};
