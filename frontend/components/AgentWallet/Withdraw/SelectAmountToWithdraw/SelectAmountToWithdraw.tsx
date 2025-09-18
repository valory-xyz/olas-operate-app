import { Button, Flex, Typography } from 'antd';

import { BackButton } from '@/components/ui/BackButton';
import { CardFlex } from '@/components/ui/CardFlex';

import { usePearlWallet } from '../../AgentWalletContext';
import { cardStyles, PearlWalletToExternalWallet } from '../common';
import { TokenAmountInput } from './TokenAmountInput';

const { Title } = Typography;

type SelectAmountToWithdrawProps = {
  onBack: () => void;
  onContinue: () => void;
};

export const SelectAmountToWithdraw = ({
  onBack,
  onContinue,
}: SelectAmountToWithdrawProps) => {
  const { availableAssets, amountsToWithdraw, onAmountChange } =
    usePearlWallet();

  const isContinueDisabled = availableAssets.every(({ symbol, amount }) => {
    const amountToWithdraw = amountsToWithdraw?.[symbol] ?? 0;
    return amountToWithdraw <= 0 || amountToWithdraw > amount;
  });

  return (
    <CardFlex $noBorder $padding="32px" style={cardStyles}>
      <Flex gap={32} vertical>
        <Flex gap={12} vertical>
          <BackButton onPrev={onBack} />
          <Flex vertical justify="space-between" gap={12}>
            <Title level={4} className="m-0">
              Select Amount to Withdraw
            </Title>
          </Flex>
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

        <Button
          disabled={isContinueDisabled}
          onClick={onContinue}
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
