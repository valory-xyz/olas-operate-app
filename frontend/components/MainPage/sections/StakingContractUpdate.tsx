import { RightOutlined } from '@ant-design/icons';
import { Button, Flex, Skeleton, Typography } from 'antd';
import { useMemo } from 'react';

import { NA } from '@/constants/symbols';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { useStakingContractContext } from '@/hooks/useStakingContractDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { CardSection } from '../../styled/CardSection';

const { Text } = Typography;

export const StakingContractSection = () => {
  const { goto } = usePageState();
  const { isActiveStakingProgramLoaded, selectedStakingProgramMeta } =
    useStakingProgram();

  const { isAllStakingContractDetailsRecordLoaded } =
    useStakingContractContext();
  const { selectedService } = useServices();
  const { selectedAgentConfig } = useServices();

  const { isServiceTransitioning } = useService(
    selectedService?.service_config_id,
  );

  const gotoManageStakingButton = useMemo(() => {
    if (!isActiveStakingProgramLoaded) return <Skeleton.Input />;

    return (
      <Button
        type="link"
        className="p-0"
        onClick={() => goto(Pages.ManageStaking)}
        disabled={
          !isAllStakingContractDetailsRecordLoaded ||
          isServiceTransitioning ||
          selectedAgentConfig.isUnderConstruction
        }
      >
        {selectedStakingProgramMeta?.name || NA}
        <RightOutlined />
      </Button>
    );
  }, [
    isActiveStakingProgramLoaded,
    isAllStakingContractDetailsRecordLoaded,
    isServiceTransitioning,
    selectedAgentConfig,
    selectedStakingProgramMeta?.name,
    goto,
  ]);

  return (
    <CardSection padding="16px 24px">
      <Flex
        gap={16}
        justify="space-between"
        align="center"
        style={{ width: '100%' }}
      >
        <Text type="secondary">Staking contract</Text>
        {gotoManageStakingButton}
      </Flex>
    </CardSection>
  );
};
