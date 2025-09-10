import { Button, Flex, Typography } from 'antd';
import { CSSProperties, useState } from 'react';

import { BackButton } from '@/components/ui/BackButton';
import { CardFlex } from '@/components/ui/CardFlex';

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
  const [value, setValue] = useState(100);
  const totalAmount = 1000;

  const handleOnChange = (x: number | null) => {
    if (x !== null && x > 0 && x <= totalAmount) {
      setValue(x);
    }
  };

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

        <Flex justify="space-between" align="center">
          <TokenAmountInput
            tokenSymbol="OLAS"
            onChange={handleOnChange}
            value={value}
            totalAmount={totalAmount}
            totalAmountInUsd={555}
          />
        </Flex>

        <Button onClick={onContinue} type="primary" block>
          Continue
        </Button>
      </Flex>
    </CardFlex>
  );
};
