import { Button, Typography } from 'antd';

import { Alert } from '@/components/ui';
import { Pages } from '@/enums';
import { usePageState } from '@/hooks';

const { Text } = Typography;

export const ContractDeprecatedAlert = ({
  stakingProgramName,
}: {
  stakingProgramName: string;
}) => {
  const { goto } = usePageState();

  const handleSwitchContract = () => {
    goto(Pages.SelectStaking);
  };

  return (
    <Alert
      showIcon
      className="mt-16"
      type="error"
      message={
        <>
          <Text className="text-sm font-weight-500">
            {stakingProgramName} contract is deprecated
          </Text>
          <Text className="text-sm flex mt-4 mb-8">
            Switch to one of the available contracts to start your agent.
          </Text>
          <Button size="small" onClick={handleSwitchContract}>
            Switch Staking Contract
          </Button>
        </>
      }
    />
  );
};
