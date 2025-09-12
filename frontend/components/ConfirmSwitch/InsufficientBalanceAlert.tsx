import { Button, Flex, Typography } from 'antd';

import { CustomAlert } from '@/components/Alert';
import { getNativeTokenSymbol } from '@/config/tokens';
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

          {/* TODO: add button action */}
          <Button size="small">
            Deposit {insufficientOlasBalance ? 'OLAS' : tokenSymbol}
          </Button>
        </Flex>
      }
    />
  );
};
