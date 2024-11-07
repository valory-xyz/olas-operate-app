import { Flex, Typography } from 'antd';
import { useMemo } from 'react';

import { Pages } from '@/enums/PageState';
import { usePageState } from '@/hooks/usePageState';
import {
  useActiveStakingContractInfo,
  useStakingContractContext,
  useStakingContractInfo,
} from '@/hooks/useStakingContractInfo';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { CustomAlert } from '../../../Alert';

const { Text } = Typography;

export const NoAvailableSlotsOnTheContract = () => {
  const { goto } = usePageState();

  const {
    activeStakingProgramId,
    defaultStakingProgramId,
    activeStakingProgramMeta,
    defaultStakingProgramMeta,
  } = useStakingProgram();

  const { isStakingContractInfoRecordLoaded } = useStakingContractContext();
  const { isServiceStaked } = useActiveStakingContractInfo();
  const { hasEnoughServiceSlots } = useStakingContractInfo(
    activeStakingProgramId ?? defaultStakingProgramId,
  );

  const stakingProgramName = useMemo(() => {
    if (!isStakingContractInfoRecordLoaded) return null;
    if (activeStakingProgramId) {
      return activeStakingProgramMeta?.name;
    }
    return defaultStakingProgramMeta?.name;
  }, [
    activeStakingProgramId,
    activeStakingProgramMeta?.name,
    defaultStakingProgramMeta?.name,
    isStakingContractInfoRecordLoaded,
  ]);

  if (!isStakingContractInfoRecordLoaded) return null;
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
            No available staking slots on {stakingProgramName}
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
