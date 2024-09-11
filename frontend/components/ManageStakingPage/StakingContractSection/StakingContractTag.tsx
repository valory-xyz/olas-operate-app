import { Tag } from 'antd';

import { StakingProgramStatus } from '@/enums/StakingProgramStatus';

export const StakingContractTag = ({
  status,
}: {
  status: StakingProgramStatus | null;
}) => {
  if (status === StakingProgramStatus.Selected) {
    return <Tag color="purple">Active</Tag>;
  }
  return null;
};
