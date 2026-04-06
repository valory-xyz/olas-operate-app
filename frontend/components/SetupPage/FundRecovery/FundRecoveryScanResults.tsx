import { Alert, Button, Flex, Tag, Typography } from 'antd';
import { useMemo } from 'react';

import { Table } from '@/components/ui';
import {
  ChainAmounts,
  FundRecoveryServiceInfo,
  FundRecoveryScanResponse,
} from '@/types/FundRecovery';

const { Title, Text } = Typography;

type BalanceRow = {
  key: string;
  chainId: string;
  walletType: string;
  address: string;
  token: string;
  amount: string;
};

const buildBalanceRows = (
  balances: ChainAmounts,
  masterEoaAddress: string,
): BalanceRow[] => {
  const rows: BalanceRow[] = [];

  Object.entries(balances).forEach(([chainId, addressMap]) => {
    Object.entries(addressMap).forEach(([address, tokenMap]) => {
      Object.entries(tokenMap).forEach(([token, amount]) => {
        if (amount === '0' || amount === '') return;

        const isMasterEoa =
          address.toLowerCase() === masterEoaAddress.toLowerCase();
        const walletType = isMasterEoa ? 'Master EOA' : 'Master Safe';

        rows.push({
          key: `${chainId}-${address}-${token}`,
          chainId,
          walletType,
          address,
          token,
          amount,
        });
      });
    });
  });

  return rows;
};

const balanceColumns = [
  {
    title: 'Chain',
    dataIndex: 'chainId',
    key: 'chainId',
    render: (chainId: string) => <Tag>{chainId}</Tag>,
  },
  {
    title: 'Wallet',
    dataIndex: 'walletType',
    key: 'walletType',
  },
  {
    title: 'Token',
    dataIndex: 'token',
    key: 'token',
    render: (token: string) => (
      <Text ellipsis style={{ maxWidth: 120 }} title={token}>
        {token.startsWith('0x')
          ? `${token.slice(0, 6)}...${token.slice(-4)}`
          : token}
      </Text>
    ),
  },
  {
    title: 'Amount',
    dataIndex: 'amount',
    key: 'amount',
  },
];

type ServiceWarningsProps = {
  services: FundRecoveryServiceInfo[];
};

const ServiceWarnings = ({ services }: ServiceWarningsProps) => {
  const nonUnstakableServices = services.filter((s) => !s.can_unstake);
  if (nonUnstakableServices.length === 0) return null;

  return (
    <Flex vertical gap={8}>
      {nonUnstakableServices.map((service) => (
        <Alert
          key={`${service.chain_id}-${service.service_id}`}
          type="warning"
          showIcon
          message={`Service ${service.service_id} on chain ${service.chain_id} cannot be unstaked (state: ${service.state}). Recovery will proceed without unstaking this service.`}
        />
      ))}
    </Flex>
  );
};

type GasWarningsProps = {
  gasWarning: Record<string, { insufficient: boolean }>;
  onRescan: () => void;
  isRescanning: boolean;
};

const GasWarnings = ({
  gasWarning,
  onRescan,
  isRescanning,
}: GasWarningsProps) => {
  const insufficientChains = Object.entries(gasWarning)
    .filter(([, v]) => v.insufficient)
    .map(([chainId]) => chainId);

  if (insufficientChains.length === 0) return null;

  return (
    <Flex vertical gap={8}>
      {insufficientChains.map((chainId) => (
        <Alert
          key={chainId}
          type="error"
          showIcon
          message={`Insufficient gas on chain ${chainId}`}
          description={
            <Flex vertical gap={8} style={{ marginTop: 4 }}>
              <Text>
                There is not enough native token to pay gas fees on chain{' '}
                {chainId}. Please add funds to the master EOA before recovering.
              </Text>
              <Button
                size="small"
                onClick={onRescan}
                loading={isRescanning}
                style={{ width: 'fit-content' }}
              >
                Re-scan
              </Button>
            </Flex>
          }
        />
      ))}
    </Flex>
  );
};

type FundRecoveryScanResultsProps = {
  scanResult: FundRecoveryScanResponse;
  isExecuting: boolean;
  isRescanning: boolean;
  onRescan: () => void;
  onRecover: () => void;
};

export const FundRecoveryScanResults = ({
  scanResult,
  isExecuting,
  isRescanning,
  onRescan,
  onRecover,
}: FundRecoveryScanResultsProps) => {
  const balanceRows = useMemo(
    () => buildBalanceRows(scanResult.balances, scanResult.master_eoa_address),
    [scanResult.balances, scanResult.master_eoa_address],
  );

  const hasInsufficientGas = useMemo(
    () => Object.values(scanResult.gas_warning).some((v) => v.insufficient),
    [scanResult.gas_warning],
  );

  const hasBalances = balanceRows.length > 0;

  return (
    <Flex vertical gap={24}>
      <Flex vertical gap={8}>
        <Title level={4} className="m-0">
          Scan results
        </Title>
        <Text type="secondary">
          Master EOA: <Text code>{scanResult.master_eoa_address}</Text>
        </Text>
      </Flex>

      {hasBalances ? (
        <Table<BalanceRow>
          dataSource={balanceRows}
          columns={balanceColumns}
          pagination={false}
          size="small"
        />
      ) : (
        <Alert
          type="info"
          showIcon
          message="No recoverable balances found"
          description="There are no non-zero balances associated with this recovery phrase."
        />
      )}

      <ServiceWarnings services={scanResult.services} />

      <GasWarnings
        gasWarning={scanResult.gas_warning}
        onRescan={onRescan}
        isRescanning={isRescanning}
      />

      <Flex gap={12}>
        <Button size="large" onClick={onRescan} loading={isRescanning} block>
          Re-scan
        </Button>
        <Button
          type="primary"
          size="large"
          block
          disabled={hasInsufficientGas || !hasBalances}
          loading={isExecuting}
          onClick={onRecover}
        >
          Recover Funds
        </Button>
      </Flex>
    </Flex>
  );
};
