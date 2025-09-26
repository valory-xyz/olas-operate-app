import {
  ArrowRightOutlined,
  LoadingOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Button, Flex, Image, Typography } from 'antd';
import { isEmpty, values } from 'lodash';

import { SuccessOutlined } from '@/components/custom-icons';
import { BackButton } from '@/components/ui/BackButton';
import { CardFlex } from '@/components/ui/CardFlex';
import { Divider } from '@/components/ui/Divider';
import { TokenAmountInput } from '@/components/ui/TokenAmountInput';
import { SUPPORT_URL, UNICODE_SYMBOLS } from '@/constants';

import { useAgentWallet } from '../AgentWalletProvider';
import { cardStyles } from '../common';
import { useFundAgent } from './useFundAgent';

const { Title, Text, Link } = Typography;

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

const FundTransferInProgress = () => (
  <Flex gap={32} vertical>
    <Flex align="center" justify="center">
      <LoadingOutlined />
    </Flex>
    <Flex gap={12} vertical align="center" className="text-center">
      <Title level={4} className="m-0">
        Transfer in Progress
      </Title>
      <Text className="text-neutral-tertiary">
        It usually takes 1-2 minutes.
      </Text>
    </Flex>
  </Flex>
);

const TransferComplete = ({ onClose }: { onClose: () => void }) => (
  <Flex gap={32} vertical>
    <Flex align="center" justify="center">
      <SuccessOutlined />
    </Flex>

    <Flex gap={12} vertical className="text-center">
      <Title level={4} className="m-0">
        Transfer Complete!
      </Title>
      <Text className="text-neutral-tertiary">
        Funds transferred to the Pearl wallet.
      </Text>
    </Flex>

    <Button onClick={onClose} type="primary" block size="large">
      Close
    </Button>
  </Flex>
);

type WithdrawalFailedProps = { onTryAgain: () => void };
const WithdrawalFailed = ({ onTryAgain }: WithdrawalFailedProps) => (
  <Flex gap={32} vertical>
    <Flex align="center" justify="center">
      <WarningOutlined />
    </Flex>

    <Flex gap={12} vertical className="text-center">
      <Title level={4} className="m-0">
        Transfer Failed
      </Title>
      <Text className="text-neutral-tertiary">
        Something went wrong with your transfer. Please try again or contact the
        Olas community.
      </Text>
    </Flex>

    <Flex gap={16} vertical className="text-center">
      <Button onClick={onTryAgain} type="primary" block size="large">
        Try Again
      </Button>
      <Link href={SUPPORT_URL} target="_blank" rel="noreferrer">
        Join Olas Community Discord Server {UNICODE_SYMBOLS.EXTERNAL_LINK}
      </Link>
    </Flex>
  </Flex>
);

type FundAgentProps = { onBack: () => void };

export const FundAgent = ({ onBack }: FundAgentProps) => {
  const {
    availableAssets,
    amountsToWithdraw,
    onAmountChange,
    onConfirmTransfer,
  } = useFundAgent();

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

      <CardFlex $noBorder $padding="32px" className="w-full">
        <Button
          disabled={
            isEmpty(amountsToWithdraw) ||
            values(amountsToWithdraw).every((x) => x === 0)
          }
          onClick={onConfirmTransfer}
          type="primary"
          className="w-full"
          size="large"
        >
          Confirm Transfer
        </Button>
      </CardFlex>
    </Flex>
  );
};
