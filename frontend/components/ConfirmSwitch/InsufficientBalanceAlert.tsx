import { Button, Flex, Typography } from 'antd';

import { CustomAlert } from '../Alert';

const { Text } = Typography;

type InsufficientBalanceAlertProps = {
  olasBalance: number;
  requiredOlasBalance: number;
  chainName: string;
};

export const InsufficientBalanceAlert = ({
  requiredOlasBalance,
  chainName,
}: InsufficientBalanceAlertProps) => {
  return (
    <CustomAlert
      type="warning"
      showIcon
      className="mb-24"
      message={
        <Flex justify="space-between">
          <Text className="text-sm">
            Insufficient balance. Add {requiredOlasBalance} OLAS on {chainName}{' '}
            Chain to continue.
          </Text>

          {/* TODO: add button action */}
          <Button size="small">Deposit OLAS</Button>
        </Flex>
      }
    />
  );
};
