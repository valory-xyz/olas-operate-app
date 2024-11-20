import { Button, Popover } from 'antd';
import { isNil } from 'lodash';
import { useMemo } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import { Pages } from '@/enums/Pages';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useBalanceContext } from '@/hooks/useBalanceContext';
import { useModals } from '@/hooks/useModals';
import { usePageState } from '@/hooks/usePageState';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { useServiceTemplates } from '@/hooks/useServiceTemplates';
import {
  useActiveStakingContractInfo,
  useStakingContractDetails,
} from '@/hooks/useStakingContractDetails';
import { ServicesService } from '@/service/Services';

import { CountdownUntilMigration } from './CountdownUntilMigration';
import { CantMigrateReason, useMigrate } from './useMigrate';

type MigrateButtonProps = {
  stakingProgramId: StakingProgramId;
};
export const MigrateButton = ({
  stakingProgramId: stakingProgramIdToMigrateTo,
}: MigrateButtonProps) => {
  const { goto } = usePageState();
  const { serviceTemplate } = useServiceTemplates();
  const {
    setPaused: setIsServicePollingPaused,
    isFetched: isServicesLoaded,
    selectedService,
  } = useServices();

  const { setDeploymentStatus } = useService({
    serviceConfigId:
      isServicesLoaded && selectedService
        ? selectedService.service_config_id
        : '',
  });

  const { setIsPaused: setIsBalancePollingPaused } = useBalanceContext();

  const { activeStakingContractDetails, isActiveStakingContractDetailsLoaded } =
    useActiveStakingContractInfo();
  const { stakingContractInfo: defaultStakingContractInfo } =
    useStakingContractDetails(defaultStakingProgramId);

  const currentStakingContractInfo = useMemo(() => {
    if (!isActiveStakingContractDetailsLoaded) return;
    if (activeStakingContractDetails) return activeStakingContractDetails;
    return defaultStakingContractInfo;
  }, [
    activeStakingContractDetails,
    defaultStakingContractInfo,
    isActiveStakingContractDetailsLoaded,
  ]);

  const { setMigrationModalOpen } = useModals();

  const { migrateValidation, firstDeployValidation } = useMigrate(
    stakingProgramIdToMigrateTo,
  );

  // if false, user is migrating, not running for first time
  const isFirstDeploy = useMemo(() => {
    if (!isServicesLoaded) return false;
    if (selectedService) return false;

    return true;
  }, [isServicesLoaded, selectedService]);

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

          // TODO: we should not get the default staking program id
          // from the context, we should get it from the service
          // setDefaultStakingProgramId(stakingProgramId);

          try {
            setDeploymentStatus(MiddlewareDeploymentStatus.DEPLOYING);
            goto(Pages.Main);

            // update service
            await ServicesService.updateService({
              stakingProgramId,
              serviceTemplate,
              serviceUuid: serviceTemplate.service_config_id,
              deploy: true,
              useMechMarketplace:
                stakingProgramId === StakingProgramId.BetaMechMarketplace,
            });

            // start service after updating
            await ServicesService.startService(
              serviceTemplate.service_config_id,
            );

            await updateStakingProgram(); // TODO: refactor to support single staking program & multi staking programs, this on longer works

            setMigrationModalOpen(true);
          } catch (error) {
            console.error(error);
          } finally {
            setIsServicePollingPaused(false);
            setIsBalancePollingPaused(false);
            // updateServiceStatus(); // TODO: update service status
          }
        }}
      >
        Switch and run agent
      </Button>
    </Popover>
  );
};
