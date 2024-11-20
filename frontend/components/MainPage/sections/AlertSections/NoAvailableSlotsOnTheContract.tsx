import { Flex, Typography } from 'antd';

import { NA } from '@/constants/symbols';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import {
  useActiveStakingContractInfo,
  useStakingContractContext,
  useStakingContractDetails,
} from '@/hooks/useStakingContractDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { CustomAlert } from '../../../Alert';

const { Text } = Typography;

export const NoAvailableSlotsOnTheContract = () => {
  const { goto } = usePageState();

  const { activeStakingProgramId, activeStakingProgramMeta } =
    useStakingProgram();

  const { isAllStakingContractDetailsRecordLoaded } =
    useStakingContractContext();
  const { isServiceStaked } = useActiveStakingContractInfo();
  const { hasEnoughServiceSlots } = useStakingContractDetails(
    activeStakingProgramId,
  );

  if (!isAllStakingContractDetailsRecordLoaded) return null;
  if (hasEnoughServiceSlots) return null;
  if (isServiceStaked) return null;

  return (
    <CustomAlert
      type="warning"
      fullWidth
      showIcon
      message={
        <Flex justify="space-between" gap={4} vertical>
          <Text className="font-weight-600">
            No available staking slots on {activeStakingProgramMeta?.name || NA}
          </Text>
          <span className="text-sm">
            Select a contract with available slots to start your agent.
          </span>
          <Text
            className="pointer hover-underline text-primary text-sm"
            onClick={() => goto(Pages.ManageStaking)}
          >
            Change staking contract
          </Text>
        </Flex>
      }
    />
  );
};
