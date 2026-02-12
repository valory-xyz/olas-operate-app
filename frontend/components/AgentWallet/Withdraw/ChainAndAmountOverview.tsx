import { ArrowRightOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Button, Flex, Skeleton, Typography } from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import styled from 'styled-components';

import { AgentNft } from '@/components/AgentNft';
import { BackButton, CardFlex, Divider, Tooltip } from '@/components/ui';
import { CHAIN_CONFIG } from '@/config/chains';
import { TokenSymbolConfigMap } from '@/config/tokens';
import { COLOR, NA } from '@/constants';
import { useBalanceContext } from '@/hooks';
import { formatNumber } from '@/utils';

import { useAgentWallet } from '../AgentWalletProvider';

const { Title, Text } = Typography;

const OverviewContainer = styled(Flex)`
  padding: 12px 16px;
  border-radius: 10px;
  background-color: ${COLOR.BACKGROUND};
`;

const AssetsFromStakingContractTitle = () => (
  <Flex align="center" gap={4}>
    <Text className="text-neutral-tertiary">Assets from staking contract</Text>
    <Tooltip
      title={
        <Text className="text-sm">
          Each AI agent has staked assets defined by its staking contract — an
          Agent NFT and an OLAS deposit. You can find these in your Pearl
          Wallet.
        </Text>
      }
      placement="right"
      style={{ fontSize: 14 }}
    >
      <InfoCircleOutlined className="text-neutral-tertiary" />
    </Tooltip>
  </Flex>
);

const WithdrawalAddressTitle = () => (
  <Flex vertical justify="space-between" gap={12}>
    <Title level={4} className="m-0">
      Withdraw from Agent Wallet
    </Title>
    <Text>
      Review the assets you’ll receive to your Pearl Wallet. Withdrawing these
      funds will disable your agent, and it will not be able to run again until
      you refund it.
    </Text>
  </Flex>
);

const AgentWalletToPearlWallet = () => {
  const { agentName, agentImgSrc } = useAgentWallet();
  return (
    <Flex vertical style={{ margin: '0 -32px' }}>
      <Divider className="m-0" />
      <Flex gap={16} style={{ padding: '12px 32px' }} align="center">
        <Flex gap={8} align="center">
          <Text type="secondary">From</Text>{' '}
          {agentName && agentImgSrc && (
            <Image src={agentImgSrc} alt={agentName} width={28} height={28} />
          )}
          <Text className="font-weight-500">{agentName || NA}</Text>
        </Flex>
        <ArrowRightOutlined style={{ fontSize: 12 }} />
        <Text>
          <Text type="secondary">To</Text>{' '}
          <Text className="font-weight-500">Pearl Wallet</Text>
        </Text>
      </Flex>
      <Divider className="m-0" />
    </Flex>
  );
};

const DestinationChain = ({ chainName }: { chainName: string }) => (
  <Flex vertical gap={8}>
    <Text className="text-neutral-tertiary">Destination chain</Text>
    <OverviewContainer gap={8} align="center">
      <Image
        src={`/chains/${kebabCase(chainName)}-chain.png`}
        alt={`${chainName} logo`}
        width={20}
        height={20}
      />
      {chainName}
    </OverviewContainer>
  </Flex>
);

const AssetsFromAgentWallet = () => {
  const { availableAssets } = useAgentWallet();

  if (availableAssets.length === 0) return null;
  return (
    <Flex vertical gap={8}>
      <Text className="text-neutral-tertiary">Assets from Agent Wallet</Text>
      <OverviewContainer gap={8} vertical>
        {availableAssets.map((asset) => (
          <Flex key={asset.symbol} gap={8} align="center">
            <Image
              src={TokenSymbolConfigMap[asset.symbol].image}
              alt={asset.symbol}
              width={20}
              height={20}
            />
            <Text>{formatNumber(asset.amount, 4)}</Text>
            <Text>{asset.symbol}</Text>
          </Flex>
        ))}
      </OverviewContainer>
    </Flex>
  );
};

const AssetsFromStakingContract = () => {
  const { isLoading: isBalanceLoading, totalStakedOlasBalance } =
    useBalanceContext();

  return (
    <Flex vertical gap={8}>
      <AssetsFromStakingContractTitle />
      <OverviewContainer vertical gap={12} align="start">
        <Flex gap={8} align="center">
          <Image
            src={`/tokens/olas-icon.png`}
            alt="OLAS rewards"
            width={20}
            height={20}
          />
          {isBalanceLoading ? (
            <Skeleton.Input active size="small" style={{ width: 80 }} />
          ) : (
            <Text>{formatNumber(totalStakedOlasBalance, 4)} OLAS</Text>
          )}
        </Flex>

        <AgentNft />
      </OverviewContainer>
    </Flex>
  );
};

type ChainAndAmountOverviewProps = {
  onBack: () => void;
  onWithdraw: () => void;
};

export const ChainAndAmountOverview = ({
  onBack,
  onWithdraw,
}: ChainAndAmountOverviewProps) => {
  const { walletChainId } = useAgentWallet();
  const chainDetails = walletChainId ? CHAIN_CONFIG[walletChainId] : null;

  return (
    <CardFlex $noBorder $padding="32px" className="w-full">
      <Flex gap={32} vertical>
        <Flex gap={12} vertical>
          <BackButton onPrev={onBack} />
          <WithdrawalAddressTitle />
        </Flex>
        <AgentWalletToPearlWallet />

        <Flex vertical gap={32}>
          {chainDetails?.name && (
            <DestinationChain chainName={chainDetails.name} />
          )}
          <AssetsFromAgentWallet />
          <AssetsFromStakingContract />
        </Flex>

        <Button type="primary" onClick={onWithdraw} block size="large">
          Withdraw
        </Button>
      </Flex>
    </CardFlex>
  );
};
