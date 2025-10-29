import { Button, Flex, Typography } from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import { useEffect } from 'react';

import { AgentNft } from '@/components/AgentNft';
import { InfoTooltip } from '@/components/InfoTooltip';
import { CardFlex, Segmented, Tooltip } from '@/components/ui';
import { WalletsTooltip } from '@/components/ui/WalletsTooltip';
import { COLOR } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { useMasterWalletContext, useServices } from '@/hooks';

import { AvailableAssetsTable } from './AvailableAssetsTable';
import { LowPearlWalletBalanceAlert } from './LowPearlWalletBalanceAlert';
import { StakedAssetsTable } from './StakedAssetsTable';

const { Text, Title } = Typography;

const AvailableAssetsTooltip = () => {
  const { masterEoa, getMasterSafeOf } = useMasterWalletContext();
  const { selectedAgentConfig } = useServices();
  const masterSafe = getMasterSafeOf
    ? getMasterSafeOf(selectedAgentConfig.evmHomeChainId)
    : undefined;

  return (
    <WalletsTooltip
      type="pearl"
      eoaAddress={masterEoa?.address}
      safeAddress={masterSafe?.address}
      middlewareHomeChainId={selectedAgentConfig.middlewareHomeChainId}
    />
  );
};

const StakedAssetsTooltip = () => (
  <InfoTooltip
    size="medium"
    styles={{ body: { padding: 12 } }}
    iconSize={18}
    iconColor={COLOR.BLACK}
  >
    Shows which agents on this chain have assets staked
  </InfoTooltip>
);

const PearlWalletTitle = () => (
  <Flex vertical gap={12}>
    <Title level={3} className="m-0">
      Pearl Wallet
    </Title>
    <Text type="secondary">
      Manage your funds and power your agents for their on-chain activity.
    </Text>
  </Flex>
);

const AvailableAssets = () => (
  <Flex vertical gap={12}>
    <Flex align="center" gap={8}>
      <Title level={5} className="m-0 text-lg">
        Available Assets
      </Title>
      <AvailableAssetsTooltip />
    </Flex>
    <CardFlex $noBorder>
      <AvailableAssetsTable />
    </CardFlex>
  </Flex>
);

const StakedAssets = () => {
  const { availableServiceConfigIds } = useServices();
  const { walletChainId } = usePearlWallet();

  const configIds = availableServiceConfigIds.filter(
    ({ chainId }) => chainId === walletChainId,
  );

  return (
    <Flex vertical gap={12}>
      <Flex align="center" gap={8}>
        <Title level={5} className="m-0 text-lg">
          Staked Assets
        </Title>
        <StakedAssetsTooltip />
      </Flex>
      <CardFlex $noBorder>
        <StakedAssetsTable />
        {configIds.map(({ configId, chainId }) => (
          <AgentNft key={configId} configId={configId} chainId={chainId} />
        ))}
      </CardFlex>
    </Flex>
  );
};

type BalancesAndAssetsProps = {
  onWithdraw: () => void;
  onDeposit: () => void;
};

export const BalancesAndAssets = ({
  onWithdraw,
  onDeposit,
}: BalancesAndAssetsProps) => {
  const {
    chains,
    walletChainId,
    onWalletChainChange,
    onReset,
    masterSafeAddress,
  } = usePearlWallet();

  // reset the state when we enter the pearl wallet screen
  useEffect(() => {
    onReset();
  }, [onReset]);

  return (
    <Flex vertical gap={32}>
      <CardFlex $noBorder>
        <Flex vertical>
          <Flex justify="space-between" align="end" gap={40}>
            <PearlWalletTitle />
            <Flex gap={8}>
              <Button onClick={onWithdraw}>Withdraw</Button>
              <Tooltip
                title={
                  masterSafeAddress ? null : 'Complete agent setup to enable'
                }
              >
                <Button
                  onClick={onDeposit}
                  type="primary"
                  disabled={!masterSafeAddress}
                >
                  Deposit
                </Button>
              </Tooltip>
            </Flex>
          </Flex>
          <LowPearlWalletBalanceAlert />
        </Flex>
      </CardFlex>

      {walletChainId && chains.length >= 2 && (
        <Segmented
          value={walletChainId}
          onChange={(chainId) => onWalletChainChange(chainId)}
          options={chains.map((chain) => ({
            value: chain.chainId,
            label: (
              <Flex gap={8}>
                <Image
                  src={`/chains/${kebabCase(chain.chainName)}-chain.png`}
                  alt={chain.chainName}
                  width={24}
                  height={24}
                />
                <Text>{chain.chainName}</Text>
              </Flex>
            ),
          }))}
        />
      )}

      <AvailableAssets />
      <StakedAssets />
    </Flex>
  );
};
