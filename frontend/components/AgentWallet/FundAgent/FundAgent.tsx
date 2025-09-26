import { ArrowRightOutlined } from '@ant-design/icons';
import { Flex, Image, Typography } from 'antd';

import { BackButton } from '@/components/ui/BackButton';
import { CardFlex } from '@/components/ui/CardFlex';
import { Divider } from '@/components/ui/Divider';
import { TokenAmountInput } from '@/components/ui/TokenAmountInput';

import { useAgentWallet } from '../AgentWalletProvider';
import { cardStyles } from '../common';
import { ConfirmTransfer } from './ConfirmTransfer';
import { useFundAgent } from './useFundAgent';

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

type FundAgentProps = { onBack: () => void };

export const FundAgent = ({ onBack }: FundAgentProps) => {
  const { availableAssets, amountsToWithdraw, onAmountChange } = useFundAgent();

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
            {availableAssets.map(({ amount, valueInUsd, symbol }) => (
              <TokenAmountInput
                key={symbol}
                tokenSymbol={symbol}
                value={amountsToWithdraw?.[symbol] ?? 0}
                totalAmount={amount}
                totalAmountInUsd={valueInUsd}
                onChange={(x) => onAmountChange(symbol, x ?? 0)}
              />
            ))}
          </Flex>
        </Flex>
      </CardFlex>

      <ConfirmTransfer fundsToTransfer={amountsToWithdraw} />
    </Flex>
  );
};
