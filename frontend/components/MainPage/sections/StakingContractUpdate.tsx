import { RightOutlined } from '@ant-design/icons';
import { Button, Flex, Skeleton, Typography } from 'antd';
import { useMemo } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import { NA } from '@/constants/symbols';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useStakingContractContext } from '@/hooks/useStakingContractDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { CardSection } from '../../styled/CardSection';

const { Text } = Typography;

export const StakingContractUpdate = () => {
  const { goto } = usePageState();
  const { isActiveStakingProgramLoaded, activeStakingProgramMeta } =
    useStakingProgram();

  const { isAllStakingContractDetailsRecordLoaded } =
    useStakingContractContext();
  const { selectedService } = useServices();
  const serviceStatus = selectedService?.deploymentStatus;

  const serviceIsTransitioning = useMemo(
    () =>
      serviceStatus === MiddlewareDeploymentStatus.DEPLOYING ||
      serviceStatus === MiddlewareDeploymentStatus.STOPPING,
    [serviceStatus],
  );

  const gotoManageStakingButton = useMemo(() => {
    if (!isActiveStakingProgramLoaded) return <Skeleton.Input />;
    return (
      <Button
        type="link"
        className="p-0"
        onClick={() => goto(Pages.ManageStaking)}
        disabled={
          !isAllStakingContractDetailsRecordLoaded || serviceIsTransitioning
        }
      >
        {activeStakingProgramMeta?.name || NA}
        <RightOutlined />
      </Button>
    );
  }, [
    goto,
    isActiveStakingProgramLoaded,
    isAllStakingContractDetailsRecordLoaded,
    serviceIsTransitioning,
    activeStakingProgramMeta?.name,
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
        {gotoManageStakingButton}
      </Flex>
    </CardSection>
  );
};
