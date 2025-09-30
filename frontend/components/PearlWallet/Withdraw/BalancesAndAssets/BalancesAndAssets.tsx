import { Button, Flex, Typography } from 'antd';
import { isNumber, kebabCase } from 'lodash';
import Image from 'next/image';
import { useEffect } from 'react';

import { AgentNft } from '@/components/AgentNft';
import { CardFlex } from '@/components/ui/CardFlex';
import { Segmented } from '@/components/ui/Segmented';
import { NA } from '@/constants/symbols';
import { formatNumber } from '@/utils/numberFormatters';

import { usePearlWallet } from '../../PearlWalletProvider';
import { AvailableAssetsTable } from './AvailableAssetsTable';
import { StakedAssetsTable } from './StakedAssetsTable';

const { Text, Title } = Typography;

const PearlWalletTitle = () => (
  <Flex vertical justify="space-between" gap={12}>
    <Title level={4} className="m-0">
      Pearl Wallet
    </Title>
    <Text type="secondary">
      Manage your funds and power your agents for their on-chain activity.{' '}
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
  const {
    aggregatedBalance,
    chains,
    walletChainId,
    onWalletChainChange,
    onReset,
  } = usePearlWallet();

  // reset the state when we enter the pearl wallet screen
  useEffect(() => {
    onReset();
  }, [onReset]);

  return (
    <Flex vertical gap={32}>
      <PearlWalletTitle />

      <CardFlex $noBorder>
        <Flex justify="space-between" align="center">
          <Flex vertical gap={8}>
            <Text type="secondary" className="text-sm">
              Aggregated balance
            </Text>
            <Title level={4} className="m-0">
              {isNumber(aggregatedBalance)
                ? `$${formatNumber(aggregatedBalance)}`
                : NA}
            </Title>
          </Flex>
          <Flex gap={8}>
            <Button onClick={onWithdraw}>Withdraw</Button>
            <Button onClick={onDeposit} type="primary">
              Deposit
            </Button>
          </Flex>
        </Flex>
      </CardFlex>

      {walletChainId && chains.length >= 2 && (
        <Segmented
          value={walletChainId}
          onChange={(chainId) => onWalletChainChange?.(chainId)}
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
