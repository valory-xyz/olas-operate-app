import { Button, Typography } from 'antd';

import { Alert } from '@/components/ui';
import { Pages } from '@/enums';
import { usePageState, useStakingProgram } from '@/hooks';

const { Text } = Typography;

export const ContractDeprecatedAlert = () => {
  const { goto } = usePageState();
  const { selectedStakingProgramMeta } = useStakingProgram();

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
            {selectedStakingProgramMeta?.name || 'Staking'} contract is
            deprecated
          </Text>
          <Text className="text-sm flex mt-4 mb-8">
            Switch to one of the available contracts to start your agent.
          </Text>
          <Button size="small" onClick={handleSwitchContract}>
            Change Staking Contract
          </Button>
        </>
      }
    />
  );
};
