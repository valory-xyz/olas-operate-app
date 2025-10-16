import { Button, Flex, Typography } from 'antd';
import { useCallback } from 'react';

import { CustomAlert } from '@/components/Alert';
import { Pages } from '@/enums';
import { usePageState } from '@/hooks';
import { formatNumber } from '@/utils/numberFormatters';

const { Text } = Typography;

type InsufficientBalanceAlertProps = {
  requiredOlasBalance: number;
  chainName: string;
};

export const InsufficientBalanceAlert = ({
  requiredOlasBalance,
  chainName,
}: InsufficientBalanceAlertProps) => {
  const { goto } = usePageState();

  const handleDeposit = useCallback(() => {
    goto(
      Pages.PearlWalletDeposit,
      requiredOlasBalance
        ? { [Pages.PearlWalletDeposit]: { requiredOlasBalance } }
        : undefined,
    );
  }, [goto, requiredOlasBalance]);

  return (
    <CustomAlert
      type="warning"
      showIcon
      className="mb-24"
      message={
        <Flex justify="space-between">
          <Text className="text-sm">
            Insufficient balance. Add ${formatNumber(requiredOlasBalance)} OLAS
            on ${chainName}
            Chain to continue.
          </Text>

          <Button size="small" onClick={handleDeposit}>
            Deposit OLAS
          </Button>
        </Flex>
      }
    />
  );
};
