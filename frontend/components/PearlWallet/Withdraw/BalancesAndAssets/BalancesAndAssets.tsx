import { Button, Flex, Typography } from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import { useEffect } from 'react';
import styled from 'styled-components';

import { AddressLink } from '@/components/AddressLink';
import { AgentNft } from '@/components/AgentNft';
import { InfoTooltip } from '@/components/InfoTooltip';
import { CardFlex, Segmented } from '@/components/ui';
import { COLOR } from '@/constants';
import { useMasterWalletContext, useServices } from '@/hooks';

import { usePearlWallet } from '../../PearlWalletProvider';
import { AvailableAssetsTable } from './AvailableAssetsTable';
import { LowPearlWalletBalanceAlert } from './LowPearlWalletBalanceAlert';
import { StakedAssetsTable } from './StakedAssetsTable';

const { Text, Title } = Typography;

const TooltipText = styled(Text)`
  font-size: 14px;
`;

const AvailableAssetsTooltip = () => {
  const { masterEoa, masterSafes } = useMasterWalletContext();
  const { selectedAgentConfig } = useServices();
  const masterSafe = masterSafes?.find(
    ({ evmChainId: chainId }) => selectedAgentConfig.evmHomeChainId === chainId,
  );

  return (
    <InfoTooltip
      styles={{ body: { padding: 16, width: 356 } }}
      iconStyles={{ color: COLOR.TEXT_NEUTRAL_PRIMARY }}
    >
      <div className="mb-16">
        Shows your spendable balance on the selected chain — your deposits plusS
        available staking rewards earned by agents on this chain.
      </div>
      <div className="mb-20">
        Pearl Wallet consists of two parts:
        <ol>
          <li>
            <TooltipText strong>Pearl Safe</TooltipText> — smart-contract wallet
            that holds funds.
          </li>
          <li>
            <TooltipText strong>Pearl Signer</TooltipText> — authorizes Safe
            transactions and keeps a small gas balance.
          </li>
        </ol>
      </div>
      <Flex className="mb-12" justify="space-between">
        <TooltipText strong>Pearl Safe Address:</TooltipText>
        {masterSafe ? (
          <AddressLink
            address={masterSafe?.address}
            middlewareChain={selectedAgentConfig.middlewareHomeChainId}
          />
        ) : (
          <TooltipText type="secondary">No Pearl Safe</TooltipText>
        )}
      </Flex>
      <Flex justify="space-between">
        <TooltipText strong>Pearl Signer Address:</TooltipText>
        {masterEoa ? (
          <AddressLink
            address={masterEoa?.address}
            middlewareChain={selectedAgentConfig.middlewareHomeChainId}
          />
        ) : (
          <TooltipText type="secondary">No Pearl Signer</TooltipText>
        )}
      </Flex>
    </InfoTooltip>
  );
};

const StakedAssetsTooltip = () => (
  <InfoTooltip
    styles={{ body: { padding: 12, width: 379 } }}
    iconStyles={{ color: COLOR.TEXT_NEUTRAL_PRIMARY }}
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
  <Flex vertical gap={24}>
    <Flex vertical gap={12}>
      <Title level={5} className="m-0 text-lg">
        Available Assets <AvailableAssetsTooltip />
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
        Staked Assets <StakedAssetsTooltip />
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
