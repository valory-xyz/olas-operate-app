import { CloseOutlined } from '@ant-design/icons';
import { Button, Drawer, Flex, Typography } from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import { useMemo } from 'react';

import { CHAIN_CONFIG } from '@/config/chains';
import { TokenSymbolConfigMap } from '@/constants';
import { useMasterWalletContext, useServices } from '@/hooks';
import { useSettingsDrawer } from '@/hooks/useSettingsDrawer';
import { formatUnits } from '@/utils/numberFormatters';

import { AddressLink } from '../AddressLink';
import { Table } from '../ui';

const { Text } = Typography;

interface SettingsDrawerProps {
  isDrawerOpen: boolean;
  onClose: () => void;
}

interface TableData extends Record<string, unknown> {
  key: string;
  chain: string;
  threshold: string;
  topUpAmount: string;
  tokenSymbol: string;
}

const SettingsDrawerTitle = (
  <Flex vertical gap={8}>
    <Text strong className="text-lg">
      Default Settings
    </Text>
    <Text type="secondary" className="text-sm">
      Predefined system values, for reference only.
    </Text>
  </Flex>
);

export const SettingsDrawer = ({
  isDrawerOpen,
  onClose,
}: SettingsDrawerProps) => {
  const { masterEoa, getMasterSafeOf } = useMasterWalletContext();
  const { selectedAgentConfig, services } = useServices();
  const { data: settings, isLoading } = useSettingsDrawer();
  const masterSafe = getMasterSafeOf
    ? getMasterSafeOf(selectedAgentConfig.evmHomeChainId)
    : undefined;

  const tableData = useMemo<TableData[]>(() => {
    if (!settings?.eoa_topups || !services) return [];

    const activeChains = new Set(
      services.map((service) => String(service.home_chain)),
    );

    return Object.values(CHAIN_CONFIG)
      .filter((chainConfig) => {
        // Only show chains that have active services
        return activeChains.has(String(chainConfig.middlewareChain));
      })
      .map((chainConfig) => {
        const chainName = chainConfig.name.toLowerCase();
        const eoaTopups = settings.eoa_topups[chainName];
        const fundingRequirement = eoaTopups
          ? Object.values(eoaTopups)[0] || 0
          : 0;

        // TODO: Replace calculation with threshold value from BE once endpoint is ready
        const refundingThreshold = fundingRequirement * 0.5;

        return {
          key: String(chainConfig.evmChainId),
          chain: chainConfig.name,
          threshold: `${formatUnits(String(refundingThreshold), 18)} ${chainConfig.nativeToken.symbol}`,
          topUpAmount: `${formatUnits(String(fundingRequirement), 18)} ${chainConfig.nativeToken.symbol}`,
          tokenSymbol: chainConfig.nativeToken.symbol,
        };
      });
  }, [settings, services]);

  const columns = [
    {
      title: 'Chain',
      key: 'chain',
      render: (_: unknown, record: TableData) => (
        <Flex align="center" gap={8}>
          <Image
            src={`/chains/${kebabCase(record.chain)}-chain.png`}
            alt={record.chain}
            width={20}
            height={20}
            className="flex"
          />
          <Text>{record.chain}</Text>
        </Flex>
      ),
      width: '33%',
    },
    {
      title: 'Threshold',
      key: 'threshold',
      render: (_: unknown, record: TableData) => (
        <Flex align="center" gap={8}>
          <Image
            src={
              TokenSymbolConfigMap[
                record.tokenSymbol as keyof typeof TokenSymbolConfigMap
              ].image
            }
            alt={record.tokenSymbol}
            width={20}
            height={20}
            className="flex"
          />
          <Text>{record.threshold}</Text>
        </Flex>
      ),
      width: '33%',
    },
    {
      title: 'Top-up Amount',
      key: 'topUpAmount',
      render: (_: unknown, record: TableData) => (
        <Flex align="center" gap={8}>
          <Image
            src={
              TokenSymbolConfigMap[
                record.tokenSymbol as keyof typeof TokenSymbolConfigMap
              ].image
            }
            alt={record.tokenSymbol}
            width={20}
            height={20}
            className="flex"
          />
          <Text>{record.topUpAmount}</Text>
        </Flex>
      ),
      width: '34%',
    },
  ];

  return (
    <Drawer
      title={SettingsDrawerTitle}
      maskClosable
      closable={false}
      open={isDrawerOpen}
      onClose={onClose}
      width={520}
      extra={<Button type="text" icon={<CloseOutlined />} onClick={onClose} />}
    >
      <Image
        src="/arrow-split-icon.png"
        alt="auto-funding"
        width={36}
        height={36}
        className="mb-12"
      />
      <Flex gap={26} vertical>
        <Flex vertical gap={6}>
          <Text strong>Auto-Funding – Pearl Wallet</Text>
          <Text className="text-sm">
            Pearl uses a separate wallet to sign transactions for the Pearl
            wallet. When balances on the signer wallet fall below the threshold,
            Pearl refills with the top-up amount from Pearl wallet. This way,
            your Pearl always stays operational without your action required.
          </Text>
        </Flex>
        <Flex gap={16} vertical>
          <Flex vertical gap={4}>
            <Text className="text-xs">Pearl Wallet Address</Text>
            {masterSafe ? (
              <AddressLink
                truncate={false}
                address={masterSafe?.address}
                middlewareChain={selectedAgentConfig.middlewareHomeChainId}
              />
            ) : (
              <Text className="text-sm" type="secondary">
                No Pearl Safe
              </Text>
            )}
          </Flex>
          <Flex vertical gap={4}>
            <Text className="text-xs">Signer Wallet Address</Text>
            {masterEoa ? (
              <AddressLink
                truncate={false}
                address={masterEoa?.address}
                middlewareChain={selectedAgentConfig.middlewareHomeChainId}
              />
            ) : (
              <Text className="text-sm" type="secondary">
                No Pearl Signer
              </Text>
            )}
          </Flex>
        </Flex>
        <Table
          columns={columns}
          dataSource={isLoading ? [] : tableData}
          loading={isLoading}
          pagination={false}
          size="small"
        />
      </Flex>
    </Drawer>
  );
};
