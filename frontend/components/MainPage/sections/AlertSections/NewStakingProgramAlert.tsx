import { Button, Flex, Typography } from 'antd';

import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

import { CustomAlert } from '../../../Alert';

const { Text } = Typography;

// TODO: need to figure out how to understand if there are new staking contracts
// To show this alert; also need to hide it, when a use clicks "review"
export const NewStakingProgramAlert = () => {
  const { goto } = usePageState();
  // const { activeStakingProgramId, isActiveStakingProgramLoaded } =
  //   useStakingProgram();

  // // TODO: remove single staking program check
  // if (
  //   !isActiveStakingProgramLoaded ||
  //   activeStakingProgramId !== StakingProgramId.OptimusAlpha
  // )
  //   return null;

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
