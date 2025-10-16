import { Button, Flex, Select, Typography } from 'antd';
import { isEmpty, kebabCase, values } from 'lodash';
import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';

import { CustomAlert } from '@/components/Alert';
import {
  BackButton,
  CardFlex,
  cardStyles,
  TokenAmountInput,
  WalletTransferDirection,
} from '@/components/ui';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { TokenAmounts, ValueOf } from '@/types';
import {
  asEvmChainDetails,
  asMiddlewareChain,
  tokenBalancesToSentence,
} from '@/utils';

import { SelectPaymentMethod } from './SelectPaymentMethod/SelectPaymentMethod';

const { Title, Text } = Typography;

const DepositTitle = () => (
  <Flex vertical justify="space-between" gap={12}>
    <Title level={4} className="m-0">
      Deposit to Pearl Wallet
    </Title>
    <Text>Enter the token amounts you want to deposit.</Text>
  </Flex>
);

const LowPearlWalletBalanceAlertForCurrentChain = () => {
  const { walletChainId, defaultRequirementDepositValues } = usePearlWallet();

  if (!walletChainId || isEmpty(defaultRequirementDepositValues)) return null;

  return (
    <CustomAlert
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

type DepositScreenProps = {
  onBack: () => void;
  overrideAmountsToDeposit?: TokenAmounts;
  updateStep: (newStep: ValueOf<typeof DEPOSIT_STEPS>) => void;
};

const DepositScreen = ({
  onBack,
  overrideAmountsToDeposit,
  updateStep,
}: DepositScreenProps) => {
  const handleContinue = useCallback(() => {
    updateStep(DEPOSIT_STEPS.SELECT_PAYMENT_METHOD);
  }, [updateStep]);

  const {
    onDepositAmountChange,
    amountsToDeposit: amountsToDepositFromPearlWallet,
    availableAssets,
  } = usePearlWallet();

  const amountsToDeposit = useMemo(
    () => overrideAmountsToDeposit ?? amountsToDepositFromPearlWallet,
    [overrideAmountsToDeposit, amountsToDepositFromPearlWallet],
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
                value={amountsToDeposit?.[symbol] ?? 0}
                totalAmount={amount}
                onChange={(x) => onDepositAmountChange(symbol, x ?? 0)}
                showQuickSelects={false}
              />
            ))}
          </Flex>
        </Flex>

        <Button
          disabled={values(amountsToDeposit).every((i) => i === 0)}
          onClick={handleContinue}
          type="primary"
          size="large"
          block
        >
          Continue
        </Button>
      </Flex>
    </CardFlex>
  );
};

const DEPOSIT_STEPS = {
  DEPOSIT: 'DEPOSIT',
  SELECT_PAYMENT_METHOD: 'SELECT_PAYMENT_METHOD',
} as const;

type DepositProps = {
  onBack: () => void;
  overrideAmountsToDeposit?: TokenAmounts;
};

export const Deposit = ({ onBack, overrideAmountsToDeposit }: DepositProps) => {
  const [step, setStep] = useState<ValueOf<typeof DEPOSIT_STEPS>>(
    DEPOSIT_STEPS.DEPOSIT,
  );

  const updateStep = useCallback(
    (newStep: ValueOf<typeof DEPOSIT_STEPS>) => {
      setStep(newStep);
    },
    [setStep],
  );

  switch (step) {
    case DEPOSIT_STEPS.DEPOSIT:
      return (
        <DepositScreen
          onBack={onBack}
          updateStep={updateStep}
          overrideAmountsToDeposit={overrideAmountsToDeposit}
        />
      );
    case DEPOSIT_STEPS.SELECT_PAYMENT_METHOD:
      return (
        <SelectPaymentMethod onBack={() => setStep(DEPOSIT_STEPS.DEPOSIT)} />
      );
    default:
      throw new Error('Invalid step');
  }
};
