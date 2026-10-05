import { Button, Flex, Select, Typography } from 'antd';
import { isEmpty, kebabCase, values } from 'lodash';
import Image from 'next/image';
import { useEffect } from 'react';

import { isRunStarted } from '@/components/FundingFlow/utils';
import {
  Alert,
  BackButton,
  CardFlex,
  cardStyles,
  TokenAmountInput,
  Tooltip,
  WalletTransferDirection,
} from '@/components/ui';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { useFundingRun } from '@/hooks/useFundingRun';
import { FundingRun, FundingRunMode } from '@/types/FundingRun';
import {
  asEvmChainDetails,
  asMiddlewareChain,
  tokenBalancesToSentence,
} from '@/utils';

const { Title, Text } = Typography;

const DEPOSIT_SUBTITLE = 'Enter the token amounts you want to deposit.';

const FUNDING_RUN_LABEL: Record<FundingRunMode, string> = {
  onboard: 'agent setup funding',
  deposit: 'Pearl Wallet deposit',
  signer_gas: 'Pearl Wallet top-up',
};

const DepositTitle = () => (
  <Flex vertical justify="space-between" gap={12}>
    <Title level={4} className="m-0">
      Deposit to Pearl Wallet
    </Title>
    <Text>{DEPOSIT_SUBTITLE}</Text>
  </Flex>
);

const LowPearlWalletBalanceAlertForCurrentChain = () => {
  const { walletChainId, defaultRequirementDepositValues } = usePearlWallet();

  if (!walletChainId || isEmpty(defaultRequirementDepositValues)) return null;

  return (
    <Alert
      type="error"
      showIcon
      message={
        <Flex vertical gap={4}>
          <Text className="text-sm font-weight-500">
            Low Pearl Wallet Balance on{' '}
            {asEvmChainDetails(asMiddlewareChain(walletChainId)).displayName}{' '}
            Chain
          </Text>
          <Text className="text-sm">
            To continue using Pearl without interruption, deposit{' '}
            {tokenBalancesToSentence(defaultRequirementDepositValues)} on your
            Pearl Wallet.
          </Text>
        </Flex>
      }
    />
  );
};

const SelectChainToDeposit = () => {
  const { chains, walletChainId, onWalletChainChange } = usePearlWallet();
  return (
    <Select
      value={walletChainId}
      onChange={(value) =>
        onWalletChainChange(value, { canNavigateOnReset: false })
      }
      size="large"
      style={{ maxWidth: 200 }}
    >
      {chains.map((chain) => (
        <Select.Option key={chain.chainId} value={chain.chainId}>
          <Flex align="center" gap={8}>
            <Image
              src={`/chains/${kebabCase(chain.chainName)}-chain.png`}
              alt={chain.chainName}
              width={20}
              height={20}
            />
            {`${chain.chainName} Chain`}
          </Flex>
        </Select.Option>
      ))}
    </Select>
  );
};

type DepositProps = {
  onBack: () => void;
  onContinue: () => void;
  /** Continue is replacing an old quoted run; blocks a second click. */
  isContinuing?: boolean;
};

const getContinueTooltip = (
  masterSafeAddress: string | null,
  liveRun: FundingRun | null,
) => {
  if (!masterSafeAddress) return 'Complete agent setup to enable';
  if (liveRun) {
    return `Your ${FUNDING_RUN_LABEL[liveRun.mode]} is still in progress. Finish it first.`;
  }
  return null;
};

export const Deposit = ({
  onBack,
  onContinue,
  isContinuing = false,
}: DepositProps) => {
  const { activeRun } = useFundingRun();
  // Only a run holding the user's funds blocks a new deposit; a quoted one is replaced.
  const liveRun = activeRun && isRunStarted(activeRun) ? activeRun : null;
  const {
    onDepositAmountChange,
    amountsToDeposit,
    availableAssets,
    masterSafeAddress,
    walletChainId,
    initializeDepositAmounts,
  } = usePearlWallet();

  // Initialize deposit amounts based on refill requirements when component mounts or chain changes
  useEffect(() => {
    initializeDepositAmounts();
  }, [walletChainId, initializeDepositAmounts]);

  const hasEnteredAmounts = !values(amountsToDeposit).every(
    (i) => i.amount === 0,
  );

  return (
    <CardFlex $noBorder $padding="32px" style={cardStyles}>
      <Flex gap={32} vertical>
        <Flex gap={12} vertical>
          <BackButton onPrev={onBack} />
          <DepositTitle />
        </Flex>
        <WalletTransferDirection from="External Wallet" to="Pearl Wallet" />

        <Flex vertical gap={16}>
          <SelectChainToDeposit />
          <LowPearlWalletBalanceAlertForCurrentChain />
          <Flex justify="space-between" align="center" vertical gap={16}>
            {availableAssets.map(({ amount, symbol }) => (
              <TokenAmountInput
                key={symbol}
                tokenSymbol={symbol}
                value={amountsToDeposit?.[symbol]?.amount ?? 0}
                totalAmount={amount}
                onChange={(x) =>
                  onDepositAmountChange(symbol, { amount: x ?? 0 })
                }
                showQuickSelects={false}
              />
            ))}
          </Flex>
        </Flex>

        <Tooltip title={getContinueTooltip(masterSafeAddress, liveRun)}>
          <Button
            disabled={!hasEnteredAmounts || !masterSafeAddress || !!liveRun}
            onClick={onContinue}
            loading={isContinuing}
            type="primary"
            size="large"
            block
          >
            Continue
          </Button>
        </Tooltip>
      </Flex>
    </CardFlex>
  );
};
