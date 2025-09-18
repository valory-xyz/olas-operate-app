import { ArrowRightOutlined } from '@ant-design/icons';
import { Divider, Flex, Image, Typography } from 'antd';
import { entries, kebabCase } from 'lodash';
import styled from 'styled-components';

import { BackButton } from '@/components/ui/BackButton';
import { CardFlex } from '@/components/ui/CardFlex';
import { CHAIN_CONFIG } from '@/config/chains';
import { COLOR } from '@/constants/colors';
import { TokenSymbol, TokenSymbolConfigMap } from '@/constants/token';
import { toUsd } from '@/service/toUsd';
import { formatNumber } from '@/utils/numberFormatters';

import { useAgentWallet } from '../../AgentWalletContext';
import { AgentNft } from './AgentNft';

const { Title, Text } = Typography;

const OverviewContainer = styled(Flex)`
  padding: 12px 16px;
  border-radius: 10px;
  background-color: ${COLOR.BACKGROUND};
`;

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

const PearlWalletToExternalWallet = () => {
  const { agentName, agentImgSrc } = useAgentWallet();
  return (
    <Flex vertical style={{ margin: '0 -32px' }}>
      <Divider className="m-0" />
      <Flex gap={16} style={{ padding: '12px 32px' }} align="center">
        <Flex gap={8} align="center">
          <Text type="secondary">From</Text>{' '}
          {agentName && agentImgSrc && (
            <Image src={agentImgSrc} width={28} height={28} alt={agentName} />
          )}
          <Text className="font-weight-500">{agentName}</Text>
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

export const ChainAndAmountOverview = ({ onBack }: { onBack: () => void }) => {
  const { walletChainId, amountsToWithdraw, availableAssets } =
    useAgentWallet();

  const amounts = entries(amountsToWithdraw).filter(([, amount]) => amount > 0);
  const chainDetails = walletChainId ? CHAIN_CONFIG[walletChainId] : null;

  return (
    <CardFlex $noBorder $padding="32px" className="w-full">
      <Flex gap={32} vertical>
        <Flex gap={12} vertical>
          <BackButton onPrev={onBack} />
          <WithdrawalAddressTitle />
        </Flex>
        <PearlWalletToExternalWallet />

        <Flex vertical gap={32}>
          {chainDetails?.name && (
            <Flex vertical gap={8}>
              <Text className="text-neutral-tertiary">Destination chain</Text>
              <OverviewContainer gap={8} align="center">
                <Image
                  src={`/chains/${kebabCase(chainDetails.name)}-chain.png`}
                  width={20}
                  preview={false}
                  alt={`${chainDetails.name} logo`}
                  className="flex"
                />
                {chainDetails.name}
              </OverviewContainer>
            </Flex>
          )}

          {availableAssets.length > 0 && (
            <Flex vertical gap={8}>
              <Text className="text-neutral-tertiary">
                Assets from Agent Wallet
              </Text>
              <OverviewContainer gap={8} vertical>
                {availableAssets.map((asset) => (
                  <Flex key={asset.symbol} gap={8} align="center">
                    <Image
                      src={TokenSymbolConfigMap[asset.symbol].image}
                      alt={asset.symbol}
                      width={20}
                      className="flex"
                    />
                    <Text>{formatNumber(asset.amount, 4)}</Text>
                    <Text>{asset.symbol}</Text>
                    <Text className="text-neutral-tertiary">
                      {asset.valueInUsd ? `≈ ${asset.valueInUsd}` : null}
                    </Text>
                  </Flex>
                ))}
              </OverviewContainer>
            </Flex>
          )}

          <Flex vertical gap={8}>
            <Text className="text-neutral-tertiary">
              Assets from staking contract
            </Text>
            <OverviewContainer vertical gap={12} align="start">
              {amounts.map(([untypedSymbol, amount]) => {
                const symbol = untypedSymbol as TokenSymbol;
                const valueInUsd = toUsd(symbol, amount);

                return (
                  <Flex key={symbol} gap={8} align="center">
                    <Image
                      src={TokenSymbolConfigMap[symbol as TokenSymbol].image}
                      alt={symbol}
                      width={20}
                      className="flex"
                    />
                    <Text>{formatNumber(amount, 4)}</Text>
                    <Text>{symbol}</Text>
                    &nbsp;
                    <Text className="text-neutral-tertiary">
                      {valueInUsd ? `≈ ${valueInUsd}` : null}
                    </Text>
                  </Flex>
                );
              })}
              <AgentNft />
            </OverviewContainer>
          </Flex>
        </Flex>
      </Flex>
    </CardFlex>
  );
};
