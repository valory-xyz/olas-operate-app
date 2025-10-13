import { Button, Flex, Typography } from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import { useEffect } from 'react';

import { AgentNft } from '@/components/AgentNft';
import { CardFlex, Segmented } from '@/components/ui';

import { usePearlWallet } from '../../PearlWalletProvider';
import { AvailableAssetsTable } from './AvailableAssetsTable';
import { LowPearlWalletBalanceAlert } from './LowPearlWalletBalanceAlert';
import { StakedAssetsTable } from './StakedAssetsTable';

const { Text, Title } = Typography;

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
  <Flex vertical gap={24}>
    <Flex vertical gap={12}>
      <Title level={5} className="m-0 text-lg">
        Available Assets
      </Title>
      <CardFlex $noBorder>
        <AvailableAssetsTable />
      </CardFlex>
    </Flex>
  </Flex>
);

const StakedAssets = () => (
  <Flex vertical gap={24}>
    <Flex vertical gap={12}>
      <Title level={5} className="m-0 text-lg">
        Staked Assets
      </Title>
      <CardFlex $noBorder>
        <StakedAssetsTable />
        <AgentNft />
      </CardFlex>
    </Flex>
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
  const { chains, walletChainId, onWalletChainChange, onReset } =
    usePearlWallet();

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
              <Button onClick={onDeposit} type="primary">
                Deposit
              </Button>
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
