import { Tag } from 'antd';

import { StakingProgramStatus } from '@/enums/StakingProgramStatus';

export const StakingContractTag = ({
  status,
}: {
  status: StakingProgramStatus | null;
}) => {
  if (status === StakingProgramStatus.Active) {
    return <Tag color="purple">Active</Tag>;
  }
  if (status === StakingProgramStatus.Default) {
    return <Tag color="purple">Default</Tag>;
  }
  return null;
};
