import { Button, Flex, Typography } from 'antd';

import { CustomAlert } from '@/components/Alert';
import { Tooltip } from '@/components/ui';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { Pages } from '@/enums';
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
    <CustomAlert
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
            title={!masterSafeAddress ? 'Complete agent setup to enable' : null}
          >
            <Button
              size="small"
              disabled={!masterSafeAddress}
              onClick={() => goto(Pages.DepositOlasForStaking)}
            >
              Deposit OLAS
            </Button>
          </Tooltip>
        </Flex>
      }
    />
  );
};
