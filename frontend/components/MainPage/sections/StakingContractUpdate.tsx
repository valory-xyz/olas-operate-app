import { RightOutlined } from '@ant-design/icons';
import { Button, Flex, Popover, Skeleton, Typography } from 'antd';
import { useMemo } from 'react';

import { STAKING_PROGRAM_META } from '@/constants/stakingProgramMeta';
import { Pages } from '@/enums/PageState';
import { useBalance } from '@/hooks/useBalance';
import { usePageState } from '@/hooks/usePageState';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { CardSection } from '../../styled/CardSection';

const { Text } = Typography;

export const StakingContractUpdate = () => {
  const { goto } = usePageState();
  const { isLowBalance } = useBalance();
  const {
    activeStakingProgramMeta,
    isLoadedActiveStakingProgram,
    defaultStakingProgram,
  } = useStakingProgram();

  const stakingContractName = useMemo(() => {
    if (activeStakingProgramMeta) return activeStakingProgramMeta.name;
    return STAKING_PROGRAM_META[defaultStakingProgram].name;
  }, [activeStakingProgramMeta, defaultStakingProgram]);

  const stakingButton = useMemo(() => {
    if (!isLoadedActiveStakingProgram) return <Skeleton.Input />;
    return (
      <Button
        type="link"
        className="p-0"
        disabled={isLowBalance}
        onClick={() => goto(Pages.ManageStaking)}
      >
        {stakingContractName}
        <RightOutlined />
      </Button>
    );
  }, [isLowBalance, goto, isLoadedActiveStakingProgram, stakingContractName]);

  return (
    <CardSection bordertop="true" padding="16px 24px">
      <Flex
        gap={16}
        justify="space-between"
        align="center"
        style={{ width: '100%' }}
      >
        <Text type="secondary">Staking contract</Text>

        {isLowBalance ? (
          <Popover
            placement="topLeft"
            trigger={['hover']}
            arrow={false}
            content={<Text>Fund your agent to manage staking contracts</Text>}
          >
            {stakingButton}
          </Popover>
        ) : (
          stakingButton
        )}
      </Flex>
    </CardSection>
  );
};
