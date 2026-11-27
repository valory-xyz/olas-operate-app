import { Typography } from 'antd';

import { Alert } from '@/components/ui';

import {
  DeprecatedContractTitle,
  SwitchStakingContractButton,
} from './DeprecatedContract';

const { Text } = Typography;

export const ContractDeprecatedAlert = ({
  stakingProgramName,
}: {
  stakingProgramName: string;
}) => (
  <Alert
    showIcon
    className="mt-16"
    type="error"
    message={
      <>
        <DeprecatedContractTitle stakingProgramName={stakingProgramName} />
        <Text className="text-sm flex mt-4 mb-8">
          Switch to one of the available contracts as soon as possible. Using a
          deprecated contract may prevent your agent from running or earning
          staking rewards.
        </Text>
        <SwitchStakingContractButton />
      </>
    }
  />
);
