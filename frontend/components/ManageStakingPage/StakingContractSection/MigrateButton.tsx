import { Button, Popover } from 'antd';
import { isNil } from 'lodash';
import { useMemo } from 'react';

import { DeploymentStatus } from '@/client';
import { Pages } from '@/enums/PageState';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useBalance } from '@/hooks/useBalance';
import { useModals } from '@/hooks/useModals';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useServiceTemplates } from '@/hooks/useServiceTemplates';
import { useStakingContractInfo } from '@/hooks/useStakingContractInfo';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { ServicesService } from '@/service/Services';

import { CountdownUntilMigration } from './CountdownUntilMigration';
import { CantMigrateReason, useMigrate } from './useMigrate';

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
  const { setIsPaused: setIsBalancePollingPaused } = useBalance();
  const { updateActiveStakingProgramId: updateStakingProgram } =
    useStakingProgram();
  const { activeStakingContractInfo } = useStakingContractInfo();
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
      !isNil(activeStakingContractInfo)
    ) {
      return (
        <CountdownUntilMigration
          activeStakingContractInfo={activeStakingContractInfo}
        />
      );
    }

    return validation.reason;
  }, [activeStakingContractInfo, validation]);

  return (
    <Popover content={popoverContent}>
      <Button
        type="primary"
        size="large"
        disabled={!validation.canMigrate}
        onClick={async () => {
          setIsServicePollingPaused(true);
          setIsBalancePollingPaused(true);

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

            await updateStakingProgram();

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
