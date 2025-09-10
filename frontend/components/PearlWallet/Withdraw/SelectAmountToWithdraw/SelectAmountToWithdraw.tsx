import { Button, Flex, Typography } from 'antd';
import { CSSProperties } from 'react';

import { BackButton } from '@/components/ui/BackButton';
import { CardFlex } from '@/components/ui/CardFlex';

import { usePearlWallet } from '../../PearlWalletContext';
import { PearlWalletToExternalWallet } from '../common';
import { TokenAmountInput } from './TokenAmountInput';

const { Title } = Typography;

const cardStyles: CSSProperties = {
  width: 552,
  margin: '0 auto',
};

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

        <Button onClick={onContinue} type="primary" block>
          Continue
        </Button>
      </Flex>
    </CardFlex>
  );
};
