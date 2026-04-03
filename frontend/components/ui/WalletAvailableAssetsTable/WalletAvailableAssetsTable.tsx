import { Flex, TableColumnsType, Typography } from 'antd';
import Image from 'next/image';
import { useMemo, useState } from 'react';

import { TokenSymbol, TokenSymbolConfigMap } from '@/config/tokens';
import { SupportedMiddlewareChain } from '@/constants';
import { Address, AvailableAsset } from '@/types';
import { formatNumber } from '@/utils';

import { Table } from '../Table';
import { WalletsTooltip } from './WalletsTooltip';

const { Text } = Typography;

type WalletAvailableAssetsTableProps = {
  isLoading: boolean;
  availableAssets: AvailableAsset[];
  walletTitle: 'Agent' | 'Pearl';
  nativeTokenSymbol?: TokenSymbol;
  safeNativeBalance: number;
  signerNativeBalance: number;
  safeAddress?: Address;
  signerAddress?: Address;
  middlewareHomeChainId?: SupportedMiddlewareChain;
};

export const WalletAvailableAssetsTable = ({
  isLoading,
  availableAssets,
  walletTitle,
  nativeTokenSymbol,
  safeNativeBalance,
  signerNativeBalance,
  safeAddress,
  signerAddress,
  middlewareHomeChainId,
}: WalletAvailableAssetsTableProps) => {
  const [hoveredTokenSymbol, setHoveredTokenSymbol] =
    useState<TokenSymbol | null>(null);
  const walletType = walletTitle.toLowerCase() as 'agent' | 'pearl';

  const columns: TableColumnsType<AvailableAsset> = useMemo(
    () => [
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
        width: '40%',
      },
      {
        title: 'Amount',
        key: 'amount',
        render: (_: unknown, record: AvailableAsset) => {
          const isNativeTokenRow =
            !!nativeTokenSymbol && record.symbol === nativeTokenSymbol;
          const showNativeBreakdown =
            isNativeTokenRow && hoveredTokenSymbol === record.symbol;

          return (
            <Flex align="center" gap={8}>
              <Text>{formatNumber(record.amount, 4)}</Text>

              {isNativeTokenRow ? (
                middlewareHomeChainId ? (
                  <WalletsTooltip
                    type={walletType}
                    eoaAddress={signerAddress}
                    safeAddress={safeAddress}
                    middlewareHomeChainId={middlewareHomeChainId}
                  />
                ) : null
              ) : null}

              {showNativeBreakdown && (
                <Text className="rounded-md bg-neutral-tertiary px-8 py-1 text-sm text-neutral-secondary">
                  Safe: {formatNumber(safeNativeBalance, 4)} / Signer:{' '}
                  {formatNumber(signerNativeBalance, 4)}
                </Text>
              )}
            </Flex>
          );
        },
      },
    ],
    [
      hoveredTokenSymbol,
      middlewareHomeChainId,
      nativeTokenSymbol,
      safeAddress,
      safeNativeBalance,
      signerAddress,
      signerNativeBalance,
      walletType,
    ],
  );

  return (
    <Table<AvailableAsset>
      loading={isLoading}
      dataSource={availableAssets}
      columns={columns}
      rowKey={(record) => record.symbol}
      pagination={false}
      onRow={(record) => ({
        onMouseEnter: () => setHoveredTokenSymbol(record.symbol),
        onMouseLeave: () => setHoveredTokenSymbol(null),
      })}
      locale={{ emptyText: 'No available assets' }}
    />
  );
};
