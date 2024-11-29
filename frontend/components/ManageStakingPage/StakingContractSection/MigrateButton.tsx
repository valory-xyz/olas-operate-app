import { Button, Flex, Popover, Typography } from 'antd';
import { isNil } from 'lodash';
import { useMemo } from 'react';

import { DeploymentStatus } from '@/client';
import { POPOVER_WIDTH_LARGE } from '@/constants/width';
import { Pages } from '@/enums/PageState';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useBalance } from '@/hooks/useBalance';
import { useModals } from '@/hooks/useModals';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useServiceTemplates } from '@/hooks/useServiceTemplates';
import { useStakingContractCountdown } from '@/hooks/useStakingContractCountdown';
import {
  useActiveStakingContractInfo,
  useStakingContractInfo,
} from '@/hooks/useStakingContractInfo';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { ServicesService } from '@/service/Services';
import { StakingContractInfo } from '@/types/Autonolas';

import { CantMigrateReason, useMigrate } from './useMigrate';

const { Text } = Typography;

export const CountdownUntilMigration = ({
  currentStakingContractInfo,
}: {
  currentStakingContractInfo: Partial<StakingContractInfo>;
}) => {
  const countdownDisplay = useStakingContractCountdown(
    currentStakingContractInfo,
  );

  return (
    <Flex vertical gap={1} style={{ maxWidth: POPOVER_WIDTH_LARGE }}>
      <Text strong>Can&apos;t switch because you unstaked too recently.</Text>
      <Text>This may be because your agent was suspended.</Text>
      <Text>Keep running your agent and you&apos;ll be able to switch in</Text>
      <Text>{countdownDisplay}</Text>
    </Flex>
  );
};

type MigrateButtonProps = {
  stakingProgramId: StakingProgramId;
};
export const MigrateButton = ({ stakingProgramId }: MigrateButtonProps) => {
  const { goto } = usePageState();
  const { serviceTemplate } = useServiceTemplates();
  const {
    setIsServicePollingPaused,
    setServiceStatus,
    updateServiceStatus,
    hasInitialLoaded: isServicesLoaded,
    service,
  } = useServices();

  const { defaultStakingProgramId, setDefaultStakingProgramId } =
    useStakingProgram();

  const { setIsPaused: setIsBalancePollingPaused } = useBalance();
  const { updateActiveStakingProgramId } = useStakingProgram();

  const { activeStakingContractInfo, isActiveStakingContractInfoLoaded } =
    useActiveStakingContractInfo();
  const { stakingContractInfo: defaultStakingContractInfo } =
    useStakingContractInfo(defaultStakingProgramId);

  const currentStakingContractInfo = useMemo(() => {
    if (!isActiveStakingContractInfoLoaded) return;
    if (activeStakingContractInfo) return activeStakingContractInfo;
    return defaultStakingContractInfo;
  }, [
    activeStakingContractInfo,
    defaultStakingContractInfo,
    isActiveStakingContractInfoLoaded,
  ]);

  const { setMigrationModalOpen } = useModals();

  const { migrateValidation, firstDeployValidation } =
    useMigrate(stakingProgramId);

  // if false, user is migrating, not running for first time
  const isFirstDeploy = useMemo(() => {
    if (!isServicesLoaded) return false;
    if (service) return false;
    return true;
  }, [isServicesLoaded, service]);

  const validation = isFirstDeploy ? firstDeployValidation : migrateValidation;

  const popoverContent = useMemo(() => {
    if (validation.canMigrate) return null;

    if (
      validation.reason === CantMigrateReason.NotStakedForMinimumDuration &&
      !isNil(currentStakingContractInfo)
    ) {
      return (
        <CountdownUntilMigration
          currentStakingContractInfo={currentStakingContractInfo}
        />
      );
    }

    return validation.reason;
  }, [currentStakingContractInfo, validation]);

  return (
    <Popover content={popoverContent}>
      <Button
        type="primary"
        size="large"
        disabled={!validation.canMigrate}
        onClick={async () => {
          setIsServicePollingPaused(true);
          setIsBalancePollingPaused(true);
          setDefaultStakingProgramId(stakingProgramId);

          try {
            setServiceStatus(DeploymentStatus.DEPLOYING);
            goto(Pages.Main);

            await ServicesService.createService({
              stakingProgramId,
              serviceTemplate,
              deploy: true,
              useMechMarketplace:
                stakingProgramId === StakingProgramId.BetaMechMarketplace,
            });

            await updateActiveStakingProgramId();

            setMigrationModalOpen(true);
          } catch (error) {
            console.error(error);
          } finally {
            setIsServicePollingPaused(false);
            setIsBalancePollingPaused(false);
            updateServiceStatus();
          }
        }}
      >
        Switch and run agent
      </Button>
    </Popover>
  );
};
