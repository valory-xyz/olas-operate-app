import { Flex, Image as AntdImage, TableColumnsType, Typography } from 'antd';

import { Table } from '@/components/ui/Table';
import { TokenSymbol, TokenSymbolConfigMapV2 } from '@/constants/token';

const { Text } = Typography;

type AssetRow = {
  symbol: TokenSymbol;
  amount: number;
  value: number;
};

const columns: TableColumnsType<AssetRow> = [
  {
    title: 'Token',
    key: 'token',
    render: (_: unknown, record: AssetRow) => (
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
    width: '30%',
  },
  {
    title: 'Amount',
    key: 'amount',
    render: (_: unknown, record: AssetRow) => <Text>{record.amount}</Text>,
    align: 'right',
    width: '30%',
  },
  {
    title: 'Value',
    key: 'value',
    render: (_: unknown, record: AssetRow) => <Text>${record.value}</Text>,
    align: 'right',
    width: '40%',
  },
];

type AvailableAssetsTableProps = {
  isLoading: boolean;
  tableData: AssetRow[];
};

export const AvailableAssetsTable = ({
  isLoading,
  tableData,
}: AvailableAssetsTableProps) => {
  return (
    <Table<AssetRow>
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
