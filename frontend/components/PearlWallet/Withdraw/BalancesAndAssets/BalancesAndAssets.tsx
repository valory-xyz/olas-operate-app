import { Button, Flex, Typography } from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import { useEffect } from 'react';

import { AddressLink } from '@/components/AddressLink';
import { AgentNft } from '@/components/AgentNft';
import { InfoTooltip } from '@/components/InfoTooltip';
import { CardFlex, Segmented, Tooltip } from '@/components/ui';
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
    <InfoTooltip
      size="medium"
      styles={{ body: { padding: 16 } }}
      iconSize={18}
      iconColor={COLOR.BLACK}
    >
      <div className="mb-16">
        Shows your spendable balance on the selected chain — your deposits plus
        available staking rewards earned by agents on this chain.
      </div>
      <div className="mb-20">
        Pearl Wallet consists of two parts:
        <ol>
          <li>
            <Text className="text-sm" strong>
              Pearl Safe
            </Text>{' '}
            — smart-contract wallet that holds funds.
          </li>
          <li>
            <Text className="text-sm" strong>
              Pearl Signer
            </Text>{' '}
            — authorizes Safe transactions and keeps a small gas balance.
          </li>
        </ol>
      </div>
      <Flex className="mb-12" justify="space-between">
        <Text className="text-sm" strong>
          Pearl Safe Address:
        </Text>
        {masterSafe ? (
          <AddressLink
            address={masterSafe?.address}
            middlewareChain={selectedAgentConfig.middlewareHomeChainId}
          />
        ) : (
          <Text className="text-sm" type="secondary">
            No Pearl Safe
          </Text>
        )}
      </Flex>
      <Flex justify="space-between">
        <Text className="text-sm" strong>
          Pearl Signer Address:
        </Text>
        {masterEoa ? (
          <AddressLink
            address={masterEoa?.address}
            middlewareChain={selectedAgentConfig.middlewareHomeChainId}
          />
        ) : (
          <Text className="text-sm" type="secondary">
            No Pearl Signer
          </Text>
        )}
      </Flex>
    </InfoTooltip>
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

const StakedAssets = () => (
  <Flex vertical gap={12}>
    <Flex align="center" gap={8}>
      <Title level={5} className="m-0 text-lg">
        Staked Assets
      </Title>
      <StakedAssetsTooltip />
    </Flex>
    <CardFlex $noBorder>
      <StakedAssetsTable />
      <AgentNft />
    </CardFlex>
  </Flex>
);

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
