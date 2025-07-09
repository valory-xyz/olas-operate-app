import { Flex, Typography } from 'antd';

import { NA } from '@/constants/symbols';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import {
  useActiveStakingContractDetails,
  useStakingContractDetails,
} from '@/hooks/useStakingContractDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { CustomAlert } from '../../../Alert';

const { Text } = Typography;

export const NoAvailableSlotsOnTheContract = () => {
  const { goto } = usePageState();
  const { selectedAgentConfig } = useServices();

  const {
    isActiveStakingProgramLoaded,
    selectedStakingProgramId,
    selectedStakingProgramMeta,
  } = useStakingProgram();

  const { isServiceStaked, isSelectedStakingContractDetailsLoading } =
    useActiveStakingContractDetails();

  const { hasEnoughServiceSlots } = useStakingContractDetails(
    selectedStakingProgramId,
  );

  if (!isActiveStakingProgramLoaded) return null;
  if (isSelectedStakingContractDetailsLoading) return null;

  if (hasEnoughServiceSlots) return null;
  if (isServiceStaked) return null;
  if (selectedAgentConfig.isUnderConstruction) return null;

  return (
    <CustomAlert
      type="warning"
      fullWidth
      showIcon
      message={
        <Flex justify="space-between" gap={4} vertical>
          <Text className="font-weight-600">
            No available staking slots on{' '}
            {selectedStakingProgramMeta?.name || NA}
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
