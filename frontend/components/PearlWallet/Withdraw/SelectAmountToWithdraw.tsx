import { Button, Flex, Typography } from 'antd';
import { CSSProperties } from 'react';

import { BackButton } from '@/components/ui/BackButton';
import { CardFlex } from '@/components/ui/CardFlex';

import { PearlWalletToExternalWallet } from './common';

const { Title } = Typography;

const cardStyles: CSSProperties = {
  width: 552,
  margin: '0 auto',
};

const TokenAmountInput = () => null;

type SelectAmountToWithdrawProps = {
  onBack: () => void;
  onContinue: () => void;
};

export const SelectAmountToWithdraw = ({
  onBack,
  onContinue,
}: SelectAmountToWithdrawProps) => {
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
          <TokenAmountInput />
        </Flex>

        <Button onClick={onContinue} type="primary" block>
          Continue
        </Button>
      </Flex>
    </CardFlex>
  );
};
