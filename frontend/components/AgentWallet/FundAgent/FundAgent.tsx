import { ArrowRightOutlined } from '@ant-design/icons';
import { Flex, Image, Typography } from 'antd';
import { useCallback, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import {
  BackButton,
  CardFlex,
  cardStyles,
  Divider,
  TokenAmountInput,
} from '@/components/ui';
import { TokenSymbol } from '@/constants';
import { useServices } from '@/hooks';
import { useAvailableAssets } from '@/hooks/useAvailableAssets';

import { useAgentWallet } from '../AgentWalletProvider';
import { ConfirmTransfer } from './ConfirmTransfer';

const { Title, Text } = Typography;

const FundAgentTitle = () => (
  <Flex vertical justify="space-between" gap={12}>
    <Title level={4} className="m-0">
      Fund Agent
    </Title>
    <Text className="text-neutral-tertiary">
      Enter the token amounts you want to send to your AI agent.
    </Text>
  </Flex>
);

const PearlWalletToExternalWallet = () => {
  const { agentName, agentImgSrc } = useAgentWallet();
  return (
    <Flex vertical style={{ margin: '0 -32px' }}>
      <Divider className="m-0" />
      <Flex gap={16} style={{ padding: '12px 32px' }} align="center">
        <Text>
          <Text type="secondary">From</Text>{' '}
          <Text className="font-weight-500">Pearl Wallet</Text>
        </Text>
        <ArrowRightOutlined style={{ fontSize: 12 }} />
        <Flex gap={8} align="center">
          <Text type="secondary">To</Text>{' '}
          {agentName && agentImgSrc && (
            <Image src={agentImgSrc} width={28} height={28} alt={agentName} />
          )}
          <Text className="font-weight-500">{agentName}</Text>
        </Flex>
      </Flex>
      <Divider className="m-0" />
    </Flex>
  );
};

const useFundAgent = () => {
  const { selectedAgentConfig } = useServices();
  const { isLoading: isAvailableAssetsLoading, availableAssets } =
    useAvailableAssets(selectedAgentConfig.evmHomeChainId);

  const [amountsToFund, setAmountsToFund] = useState<
    Partial<Record<TokenSymbol, number>>
  >({});

  const onAmountChange = useCallback((symbol: TokenSymbol, amount: number) => {
    setAmountsToFund((prev) => ({ ...prev, [symbol]: amount }));
  }, []);

  // Reset amounts on unmount
  useUnmount(() => {
    setAmountsToFund({});
  });

  return {
    isLoading: isAvailableAssetsLoading,
    availableAssets,
    amountsToFund,
    onAmountChange,
  };
};

export const FundAgent = ({ onBack }: { onBack: () => void }) => {
  const { availableAssets, amountsToFund, onAmountChange } = useFundAgent();

  return (
    <Flex gap={16} vertical style={cardStyles}>
      <CardFlex $noBorder $padding="32px" className="w-full">
        <Flex gap={32} vertical>
          <Flex gap={12} vertical>
            <BackButton onPrev={onBack} />
            <FundAgentTitle />
          </Flex>
          <PearlWalletToExternalWallet />

          <Flex justify="space-between" align="center" vertical gap={16}>
            {availableAssets.map(({ amount, symbol }) => (
              <TokenAmountInput
                key={symbol}
                tokenSymbol={symbol}
                value={amountsToFund?.[symbol] ?? 0}
                totalAmount={amount}
                onChange={(x) => onAmountChange(symbol, x ?? 0)}
              />
            ))}
          </Flex>
        </Flex>
      </CardFlex>

      <ConfirmTransfer fundsToTransfer={amountsToFund} />
    </Flex>
  );
};
