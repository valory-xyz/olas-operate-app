import { Button, Typography } from 'antd';

import { Alert } from '@/components/ui';
import { PAGES } from '@/constants';
import { usePageState } from '@/hooks';

const { Text } = Typography;

export const ContractDeprecatedAlert = ({
  stakingProgramName,
}: {
  stakingProgramName: string;
}) => {
  const { goto } = usePageState();

  const handleSwitchContract = () => {
    goto(PAGES.SelectStaking);
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
            Switch to one of the available contracts as soon as possible. Using
            a deprecated contract may prevent your agent from running or earning
            staking rewards.
          </Text>
          <Button size="small" onClick={handleSwitchContract}>
            Switch Staking Contract
          </Button>
        </>
      }
    />
  );
};
