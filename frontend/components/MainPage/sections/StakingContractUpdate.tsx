import { RightOutlined } from '@ant-design/icons';
import { Button, Flex, Popover, Skeleton, Typography } from 'antd';
import { useMemo } from 'react';

import { STAKING_PROGRAM_META } from '@/constants/stakingProgramMeta';
import { Pages } from '@/enums/PageState';
import { useCanStartUpdateStakingContract } from '@/hooks/useCanStartUpdateStakingContract';
import { usePageState } from '@/hooks/usePageState';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { CardSection } from '../../styled/CardSection';

const { Text } = Typography;

export const StakingContractUpdate = () => {
  const { goto } = usePageState();
  const { canUpdateStakingContract } = useCanStartUpdateStakingContract();
  const {
    activeStakingProgramMeta,
    isActiveStakingProgramLoaded,
    defaultStakingProgramId,
  } = useStakingProgram();

  const stakingContractName = useMemo(() => {
    if (activeStakingProgramMeta) return activeStakingProgramMeta.name;
    return STAKING_PROGRAM_META[defaultStakingProgramId].name;
  }, [activeStakingProgramMeta, defaultStakingProgramId]);

  const stakingButton = useMemo(() => {
    if (!isActiveStakingProgramLoaded) return <Skeleton.Input />;
    return (
      <Button
        type="link"
        className="p-0"
        disabled={!canUpdateStakingContract}
        onClick={() => goto(Pages.ManageStaking)}
      >
        {stakingContractName}
        <RightOutlined />
      </Button>
    );
  }, [
    goto,
    isActiveStakingProgramLoaded,
    stakingContractName,
    canUpdateStakingContract,
  ]);

  return (
    <CardSection bordertop="true" padding="16px 24px">
      <Flex
        gap={16}
        justify="space-between"
        align="center"
        style={{ width: '100%' }}
      >
        <Text type="secondary">Staking contract</Text>

        {canUpdateStakingContract ? (
          stakingButton
        ) : (
          <Popover
            placement="topLeft"
            trigger={['hover']}
            arrow={false}
            content={<Text>Fund your agent to manage staking contracts</Text>}
          >
            {stakingButton}
          </Popover>
        )}
      </Flex>
    </CardSection>
  );
};
