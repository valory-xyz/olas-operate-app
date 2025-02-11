import { Button, Popover } from 'antd';
import { isNil } from 'lodash';
import { useCallback, useMemo } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { Pages } from '@/enums/Pages';
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

// validation state
const useValidation = (stakingProgramId: StakingProgramId) => {
  const { isFetched: isServicesLoaded, selectedService } = useServices();
  const { migrateValidation, firstDeployValidation } =
    useMigrate(stakingProgramId);

  const validation = useMemo(() => {
    if (!isServicesLoaded) return migrateValidation;
    if (selectedService) return migrateValidation;
    return firstDeployValidation;
  }, [
    isServicesLoaded,
    selectedService,
    migrateValidation,
    firstDeployValidation,
  ]);

  return validation;
};

// migrate button details
const useMigrateButtonDetails = (stakingProgramId: StakingProgramId) => {
  const { defaultStakingProgramId } = useStakingProgram();
  const {
    isSelectedStakingContractDetailsLoading,
    selectedStakingContractDetails,
  } = useActiveStakingContractDetails();
  const { stakingContractInfo: defaultStakingContractInfo } =
    useStakingContractDetails(defaultStakingProgramId);
  const validation = useValidation(stakingProgramId);

  // current staking contract details
  const currentStakingContractInfo = useMemo(() => {
    if (isSelectedStakingContractDetailsLoading) return;
    if (selectedStakingContractDetails) return selectedStakingContractDetails;
    return defaultStakingContractInfo;
  }, [
    selectedStakingContractDetails,
    defaultStakingContractInfo,
    isSelectedStakingContractDetailsLoading,
  ]);

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

  return {
    popoverContent,
    validation,
    // currentStakingContractId: currentStakingContractInfo?.id,
  };
};

type MigrateButtonProps = {
  stakingProgramId: StakingProgramId;
};

/**
 * Contract migration button
 */
export const MigrateButton = ({
  stakingProgramId: stakingProgramIdToMigrateTo,
}: MigrateButtonProps) => {
  const { goto } = usePageState();
  const {
    setPaused: setIsServicePollingPaused,
    selectedService,
    selectedAgentType,
    overrideSelectedServiceStatus,
  } = useServices();

  // balance
  const { setIsPaused: setIsBalancePollingPaused } = useBalanceContext();

  // modals
  const { setMigrationModalOpen } = useModals();

  // staking contract details, validation, popover content
  const { setDefaultStakingProgramId } = useStakingProgram();
  const { popoverContent, validation } = useMigrateButtonDetails(
    stakingProgramIdToMigrateTo,
  );

  const serviceConfigId = selectedService?.service_config_id;
  const serviceTemplate = useMemo(
    () =>
      SERVICE_TEMPLATES.find(
        (template) => template.agentType === selectedAgentType,
      ),
    [selectedAgentType],
  );

  const handleSwitchAndRunAgent = useCallback(async () => {
    if (!serviceTemplate) return;
    if (!serviceConfigId) return;

    setIsServicePollingPaused(true);
    setIsBalancePollingPaused(true);

    const useMechMarketplace =
      stakingProgramIdToMigrateTo === StakingProgramId.PearlBetaMechMarketplace;

    try {
      overrideSelectedServiceStatus(MiddlewareDeploymentStatus.DEPLOYING);
      goto(Pages.Main);

      // update service, if it exists
      if (selectedService) {
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

        // console.log(`Switching from ${old} to ${stakingProgramIdToMigrateTo}`);
        await ServicesService.updateService({
          serviceConfigId,
          partialServiceTemplate,
        });
      }

      // create service, if it doesn't exist
      else {
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
      overrideSelectedServiceStatus(null);
      setIsServicePollingPaused(false);
      setIsBalancePollingPaused(false);
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
        loading
        disabled={!validation.canMigrate}
        onClick={handleSwitchAndRunAgent}
      >
        Switch and run agent - {stakingProgramIdToMigrateTo}
      </Button>
    </Popover>
  );
};
