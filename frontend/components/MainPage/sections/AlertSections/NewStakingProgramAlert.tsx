import { Button, Flex, Typography } from 'antd';

import { Pages } from '@/enums/Pages';
import { StakingProgramId } from '@/enums/StakingProgram';
import { usePageState } from '@/hooks/usePageState';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { CustomAlert } from '../../../Alert';

const { Text } = Typography;

export const NewStakingProgramAlert = () => {
  const { goto } = usePageState();
  const { activeStakingProgramId, isActiveStakingProgramLoaded } =
    useStakingProgram();

  // TODO: remove single staking program check
  if (
    !isActiveStakingProgramLoaded ||
    activeStakingProgramId !== StakingProgramId.OptimusAlpha
  )
    return null;

  return (
    <CustomAlert
      type="info"
      fullWidth
      showIcon
      message={
        <Flex vertical gap={2}>
          <Text>A new staking contract is available for your agent!</Text>
          <Button
            type="default"
            size="large"
            onClick={() => goto(Pages.ManageStaking)}
            style={{ width: 90 }}
          >
            Review
          </Button>
        </Flex>
      }
    />
  );
};
