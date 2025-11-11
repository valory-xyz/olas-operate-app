import { CloseOutlined } from '@ant-design/icons';
import { Button, Drawer, Flex, Typography } from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import { useMemo } from 'react';
import { TbArrowsSplit2 } from 'react-icons/tb';

import { AddressLink, IconContainer, Table } from '@/components/ui';
import { CHAIN_CONFIG } from '@/config/chains';
import {
  COLOR,
  SupportedMiddlewareChain,
  TokenSymbolConfigMap,
} from '@/constants';
import { useMasterWalletContext, useServices } from '@/hooks';
import { formatUnits } from '@/utils';

import { useSettingsDrawer } from './useSettingsDrawer';

const { Text } = Typography;

type SettingsDrawerProps = {
  isDrawerOpen: boolean;
  onClose: () => void;
};

type TableData = {
  key: string;
  chain: string;
  middlewareChain: SupportedMiddlewareChain;
  threshold: string;
  topUpAmount: string;
  tokenSymbol: string;
};

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

const SettingsDescription = () => (
  <Flex vertical gap={6}>
    <Text strong>Auto-Funding – Pearl Wallet</Text>
    <Text className="text-sm">
      Pearl uses a separate wallet to sign transactions for the Pearl wallet.
      When balances on the signer wallet fall below the threshold, Pearl refills
      with the top-up amount from Pearl wallet. This way, your Pearl always
      stays operational without your action required.
    </Text>
  </Flex>
);

const columns = [
  {
    title: 'Chain',
    key: 'chain',
    dataIndex: 'middlewareChain',
    render: (chain: SupportedMiddlewareChain, record: TableData) => (
      <Flex align="center" gap={8}>
        <Image
          src={`/chains/${kebabCase(chain)}-chain.png`}
          alt={chain}
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
    dataIndex: 'threshold',
    render: (threshold: string, record: TableData) => (
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
        <Text>{threshold}</Text>
      </Flex>
    ),
    width: '33%',
  },
  {
    title: 'Top-up Amount',
    key: 'topUpAmount',
    dataIndex: 'topUpAmount',
    render: (topUpAmount: string, record: TableData) => (
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
        />
        <Text>{topUpAmount}</Text>
      </Flex>
    ),
    width: '34%',
  },
];

export const SettingsDrawer = ({
  isDrawerOpen,
  onClose,
}: SettingsDrawerProps) => {
  const { masterEoa, getMasterSafeOf } = useMasterWalletContext();
  const { selectedAgentConfig, services } = useServices();
  const { data: settings, isLoading } = useSettingsDrawer();
  const masterSafe = getMasterSafeOf?.(selectedAgentConfig.evmHomeChainId);

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
        const middlewareChain =
          chainConfig.middlewareChain as SupportedMiddlewareChain;
        const eoaTopups = settings.eoa_topups[middlewareChain];
        const fundingRequirement = eoaTopups
          ? (Object.values(eoaTopups)[0] as number) || 0
          : 0;

        const eoaThresholds = settings.eoa_thresholds?.[middlewareChain];
        const refundingThreshold = eoaThresholds
          ? (Object.values(eoaThresholds)[0] as number) || 0
          : fundingRequirement * 0.5;

        return {
          key: String(chainConfig.evmChainId),
          chain: chainConfig.name,
          middlewareChain,
          threshold: `${formatUnits(String(refundingThreshold), 18)} ${chainConfig.nativeToken.symbol}`,
          topUpAmount: `${formatUnits(String(fundingRequirement), 18)} ${chainConfig.nativeToken.symbol}`,
          tokenSymbol: chainConfig.nativeToken.symbol,
        };
      });
  }, [settings, services]);

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
      <IconContainer>
        <TbArrowsSplit2
          size={20}
          fontSize={30}
          color={COLOR.TEXT_NEUTRAL_TERTIARY}
        />
      </IconContainer>
      <Flex gap={26} vertical>
        <SettingsDescription />
        <Flex gap={16} vertical>
          <Flex vertical gap={4}>
            <Text className="text-xs">Pearl Wallet Address</Text>
            {masterSafe?.address ? (
              <AddressLink
                truncate={false}
                address={masterSafe.address}
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
