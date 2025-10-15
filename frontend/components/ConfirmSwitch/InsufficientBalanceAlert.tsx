import { Button, Flex, Typography } from 'antd';

import { CustomAlert } from '@/components/Alert';
import { getNativeTokenSymbol } from '@/config/tokens';
import { Pages } from '@/enums';
import { usePageState } from '@/hooks';
import { useServices } from '@/hooks/useServices';
import { balanceFormat } from '@/utils/numberFormatters';

import { NotAllowedSwitchReason } from './hooks/useShouldAllowSwitch';

const { Text } = Typography;

type InsufficientBalanceAlertProps = {
  requiredOlasBalance: number;
  chainName: string;
  reason: string;
};

export const InsufficientBalanceAlert = ({
  requiredOlasBalance,
  chainName,
  reason,
}: InsufficientBalanceAlertProps) => {
  const { selectedAgentConfig } = useServices();
  const { goto } = usePageState();

  const { evmHomeChainId: homeChainId } = selectedAgentConfig;
  const tokenSymbol = getNativeTokenSymbol(homeChainId);

  const insufficientOlasBalance =
    reason === NotAllowedSwitchReason.InsufficientOlasBalance;
  const messageText = insufficientOlasBalance
    ? `Insufficient balance. Add ${balanceFormat(requiredOlasBalance)} OLAS on ${chainName}
            Chain to continue.`
    : `Insufficient balance. Add the required amount of ${tokenSymbol} on ${chainName} Chain to continue.`;
  return (
    <CustomAlert
      type="warning"
      showIcon
      className="mb-24"
      message={
        <Flex justify="space-between">
          <Text className="text-sm">{messageText}</Text>

          <Button size="small" onClick={() => goto(Pages.PearlWalletDeposit)}>
            Deposit {insufficientOlasBalance ? 'OLAS' : tokenSymbol}
          </Button>
        </Flex>
      }
    />
  );
};
