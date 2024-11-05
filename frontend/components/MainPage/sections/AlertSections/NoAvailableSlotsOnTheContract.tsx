import { Flex, Typography } from 'antd';

import { useMigrate } from '@/components/ManageStakingPage/StakingContractSection/useMigrate';
import { Pages } from '@/enums/PageState';
import { StakingProgramId } from '@/enums/StakingProgram';
import { usePageState } from '@/hooks/usePageState';
import { useStakingContractInfo } from '@/hooks/useStakingContractInfo';

import { CustomAlert } from '../../../Alert';

const { Text } = Typography;

type NoAvailableSlotsOnTheContractProps = {
  stakingProgramId: StakingProgramId;
};
export const NoAvailableSlotsOnTheContract = ({
  stakingProgramId,
}: NoAvailableSlotsOnTheContractProps) => {
  const { goto } = usePageState();
  const { hasEnoughServiceSlots } = useStakingContractInfo();
  const { canUpdateStakingContract } = useMigrate(stakingProgramId);

  if (hasEnoughServiceSlots) return null;

  return (
    <CustomAlert
      type="warning"
      fullWidth
      showIcon
      message={
        <Flex justify="space-between" gap={4} vertical>
          <Text className="font-weight-600">
            No available slots on the contract
          </Text>
          <span className="text-sm">
            Select a contract with available slots to be able to start your
            agent.
          </span>
          {canUpdateStakingContract && (
            <Text
              className="pointer hover-underline text-primary text-sm"
              onClick={() => goto(Pages.ManageStaking)}
            >
              Change staking contract
            </Text>
          )}
        </Flex>
      }
    />
  );
};
