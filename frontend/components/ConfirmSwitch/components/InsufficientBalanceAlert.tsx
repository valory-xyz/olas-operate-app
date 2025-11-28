import { Button, Flex, Typography } from 'antd';

import { Alert, Tooltip } from '@/components/ui';
import { PAGES } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { usePageState } from '@/hooks';
import { formatNumber } from '@/utils';

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
  const { masterSafeAddress } = usePearlWallet();

  return (
    <Alert
      type="warning"
      showIcon
      className="mb-24"
      message={
        <Flex justify="space-between">
          <Text className="text-sm">
            Insufficient balance. Add {formatNumber(requiredOlasBalance)} OLAS
            on {chainName} Chain to continue.
          </Text>

          <Tooltip
            title={masterSafeAddress ? null : 'Complete agent setup to enable'}
          >
            <Button
              size="small"
              disabled={!masterSafeAddress}
              onClick={() => goto(PAGES.DepositOlasForStaking)}
            >
              Deposit OLAS
            </Button>
          </Tooltip>
        </Flex>
      }
    />
  );
};
