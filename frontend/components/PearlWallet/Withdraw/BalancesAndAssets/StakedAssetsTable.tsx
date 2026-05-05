import { Flex, TableColumnsType, Typography } from 'antd';
import Image from 'next/image';
import { useMemo } from 'react';

import { AgentNft } from '@/components/AgentNft';
import { Table } from '@/components/ui';
import { TokenSymbolConfigMap } from '@/config/tokens';
import { NA } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { StakedAsset } from '@/types/Wallet';

type StakedAssetRow = StakedAsset & { isNftRow?: boolean };

const { Text } = Typography;

const columns: TableColumnsType<StakedAssetRow> = [
  {
    title: 'Agent',
    key: 'agent',
    render: (_: unknown, record: StakedAssetRow) => {
      if (record.isNftRow) {
        return {
          children: (
            <AgentNft configId={record.configId} chainId={record.chainId} />
          ),
          props: {
            colSpan: 3,
          },
        };
      }

      return {
        children: (
          <Flex align="center" gap={8}>
            {record.agentImgSrc && (
              <Image
                src={record.agentImgSrc}
                alt={record.symbol}
                width={28}
                height={28}
              />
            )}
            <Text>{record.agentName || NA}</Text>
          </Flex>
        ),
        props: {
          style: { borderBottom: 'none' },
        },
      };
    },
    width: '40%',
  },
  {
    title: 'Token',
    key: 'token',
    render: (_: unknown, record: StakedAssetRow) => {
      if (record.isNftRow) return { props: { colSpan: 0 } };

      return {
        children: (
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
        props: {
          style: { borderBottom: 'none' },
        },
      };
    },
    width: '35%',
  },
  {
    title: 'Amount',
    key: 'amount',
    render: (_: unknown, record: StakedAssetRow) => {
      if (record.isNftRow) return { props: { colSpan: 0 } };

      return {
        children: (
          <Flex vertical>
            <Text>{record.amount}</Text>
          </Flex>
        ),
        props: {
          style: { borderBottom: 'none' },
        },
      };
    },
    width: '25%',
    align: 'right',
  },
];

export const StakedAssetsTable = () => {
  const { isLoading, stakedAssets } = usePearlWallet();
  const dataSource = useMemo(() => {
    const rows: StakedAssetRow[] = [];
    stakedAssets.forEach((asset) => {
      rows.push(asset);
      rows.push({ ...asset, isNftRow: true });
    });
    return rows;
  }, [stakedAssets]);

  return (
    <Table<StakedAssetRow>
      loading={isLoading}
      dataSource={dataSource}
      columns={columns}
      rowKey={(record) => record.symbol}
      pagination={false}
      rowHoverable={false}
      locale={{ emptyText: 'No available assets' }}
      className="mb-8"
    />
  );
};
