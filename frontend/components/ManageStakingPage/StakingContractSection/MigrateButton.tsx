import { Button, Popover } from 'antd';
import { isNil } from 'lodash';
import { useCallback, useMemo } from 'react';

import { ServiceTemplate } from '@/client';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useBalanceContext } from '@/hooks/useBalanceContext';
import { useModals } from '@/hooks/useModals';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import {
  useActiveStakingContractDetails,
  useStakingContractDetails,
} from '@/hooks/useStakingContractDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { ServicesService } from '@/service/Services';
import { DeepPartial } from '@/types/Util';

import { CountdownUntilMigration } from './CountdownUntilMigration';
import { CantMigrateReason, useMigrate } from './useMigrate';

type MigrateButtonProps = {
  stakingProgramId: StakingProgramId;
};
export const MigrateButton = ({
  stakingProgramId: stakingProgramIdToMigrateTo,
}: MigrateButtonProps) => {
  const { goto } = usePageState();
  const {
    setPaused: setIsServicePollingPaused,
    isFetched: isServicesLoaded,
    selectedService,
    selectedAgentType,
    overrideSelectedServiceStatus,
  } = useServices();
  const serviceConfigId =
    isServicesLoaded && selectedService
      ? selectedService.service_config_id
      : '';
  console.log('serviceConfigId', serviceConfigId);
  const serviceTemplate = useMemo<ServiceTemplate | undefined>(
    () =>
      SERVICE_TEMPLATES.find(
        (template) => template.agentType === selectedAgentType,
      ),
    [selectedAgentType],
  );

  const { setIsPaused: setIsBalancePollingPaused } = useBalanceContext();

  const { defaultStakingProgramId, setDefaultStakingProgramId } =
    useStakingProgram();
  const {
    selectedStakingContractDetails,
    isSelectedStakingContractDetailsLoading,
  } = useActiveStakingContractDetails();
  const { stakingContractInfo: defaultStakingContractInfo } =
    useStakingContractDetails(defaultStakingProgramId);

  const currentStakingContractInfo = useMemo(() => {
    if (isSelectedStakingContractDetailsLoading) return;
    if (selectedStakingContractDetails) return selectedStakingContractDetails;
    return defaultStakingContractInfo;
  }, [
    selectedStakingContractDetails,
    defaultStakingContractInfo,
    isSelectedStakingContractDetailsLoading,
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

  const handleSwitchAndRunAgent = useCallback(async () => {
    if (!serviceTemplate) return;

    // setIsServicePollingPaused(true);
    // setIsBalancePollingPaused(true);
    // setDefaultStakingProgramId(stakingProgramIdToMigrateTo);

    const useMechMarketplace =
      stakingProgramIdToMigrateTo === StakingProgramId.PearlBetaMechMarketplace;

    // TODO: we should not get the default staking program id
    // from the context, we should get it from the service
    // setDefaultStakingProgramId(stakingProgramId);

    try {
      // overrideSelectedServiceStatus(MiddlewareDeploymentStatus.DEPLOYING);
      // goto(Pages.Main);

      if (selectedService) {
        // update service, if it exists
        const partialServiceTemplate = {
          configurations: {
            ...Object.entries(serviceTemplate.configurations).reduce(
              (acc, [middlewareChain]) => {
                acc[middlewareChain] = {
                  staking_program_id: stakingProgramIdToMigrateTo,
                  use_mech_marketplace: useMechMarketplace,
                };
                return acc;
              },
              {} as DeepPartial<typeof serviceTemplate.configurations>,
            ),
          },
        };
        console.log('partialServiceTemplate', partialServiceTemplate);

        // await ServicesService.updateService({
        //   serviceConfigId,
        //   partialServiceTemplate,
        // });
      } else {
        // create service, if it doesn't exist
        const serviceConfigParams = {
          stakingProgramId: stakingProgramIdToMigrateTo,
          serviceTemplate,
          deploy: true,
          useMechMarketplace,
        };
        await ServicesService.createService(serviceConfigParams);
      }

      // start service after updating or creating
      // await ServicesService.startService(serviceConfigId);

      setMigrationModalOpen(true);
    } catch (error) {
      console.error(error);
    } finally {
      // overrideSelectedServiceStatus(null);
      // setIsServicePollingPaused(false);
      // setIsBalancePollingPaused(false);
    }
  }, [
    serviceTemplate,
    stakingProgramIdToMigrateTo,
    serviceConfigId,
    selectedService,
    setDefaultStakingProgramId,
    setIsServicePollingPaused,
    setIsBalancePollingPaused,
    setMigrationModalOpen,
    overrideSelectedServiceStatus,
    goto,
  ]);

  return (
    <Popover content={popoverContent}>
      <Button
        type="primary"
        size="large"
        disabled={!validation.canMigrate}
        onClick={handleSwitchAndRunAgent}
      >
        Switch and run agent - {stakingProgramIdToMigrateTo}
      </Button>
    </Popover>
  );
};
