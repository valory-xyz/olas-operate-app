import { Button, Typography } from 'antd';

import { PAGES } from '@/constants';
import { usePageState } from '@/hooks';

const { Text } = Typography;

/** Title shared by the deprecated and retired contract alerts. */
export const DeprecatedContractTitle = ({
  stakingProgramName,
}: {
  stakingProgramName?: string;
}) => (
  <Text className="text-sm font-weight-500">
    {stakingProgramName
      ? `${stakingProgramName} contract is deprecated`
      : 'Staking contract is deprecated'}
  </Text>
);

export const SwitchStakingContractButton = () => {
  const { goto } = usePageState();
  return (
    <Button size="small" onClick={() => goto(PAGES.SelectStaking)}>
      Switch Staking Contract
    </Button>
  );
};
