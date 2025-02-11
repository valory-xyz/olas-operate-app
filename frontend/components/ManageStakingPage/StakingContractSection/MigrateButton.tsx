import { Button, message, Popover } from 'antd';
import { isNil } from 'lodash';
import { useCallback, useMemo, useState } from 'react';

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
import { assertRequired, DeepPartial } from '@/types/Util';

import { CountdownUntilMigration } from './CountdownUntilMigration';
import { CantMigrateReason, useMigrate } from './useMigrate';

const log = (...params: unknown[]) => window.console.log(...params);

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
  const { selectedStakingProgramId } = useStakingProgram();
  const {
    isSelectedStakingContractDetailsLoading,
    selectedStakingContractDetails,
    setActiveStakingProgramId,
  } = useActiveStakingContractDetails();
  const { stakingContractInfo: stakingContractInfo } =
    useStakingContractDetails(selectedStakingProgramId);

  const validation = useValidation(stakingProgramId);

  // current staking contract details
  const currentStakingContractInfo = useMemo(() => {
    if (isSelectedStakingContractDetailsLoading) return;
    if (selectedStakingContractDetails) return selectedStakingContractDetails;
    return stakingContractInfo;
  }, [
    selectedStakingContractDetails,
    stakingContractInfo,
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
    currentStakingContractId: selectedStakingProgramId,
    setActiveStakingProgramId,
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
  const [isMigrating, setIsMigrating] = useState(false);

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
  const {
    popoverContent,
    validation,
    setActiveStakingProgramId,
    currentStakingContractId,
  } = useMigrateButtonDetails(stakingProgramIdToMigrateTo);

  const serviceTemplate = useMemo(
    () =>
      SERVICE_TEMPLATES.find(
        (template) => template.agentType === selectedAgentType,
      ),
    [selectedAgentType],
  );

  const handleSwitchAndRunAgent = useCallback(async () => {
    if (!serviceTemplate) return;

    let serviceConfigId = null;

    setIsServicePollingPaused(true);
    setIsBalancePollingPaused(true);

    try {
      setIsMigrating(true);

      window.console.warn(
        `Switching from ${currentStakingContractId} to ${stakingProgramIdToMigrateTo}`,
      );

      // update service, if it exists
      if (selectedService) {
        serviceConfigId = selectedService.service_config_id;

        log('>> Service exists, updating service');

        const partialServiceTemplate = {
          configurations: {
            ...Object.entries(serviceTemplate.configurations).reduce(
              (acc, [middlewareChain]) => {
                acc[middlewareChain] = {
                  staking_program_id: stakingProgramIdToMigrateTo,
                };
                return acc;
              },
              {} as DeepPartial<typeof serviceTemplate.configurations>,
            ),
          },
        };
        assertRequired(
          serviceConfigId,
          'Service config Id has to be present before updating service',
        );
        const response = await ServicesService.updateService({
          serviceConfigId,
          partialServiceTemplate,
        });
        log(`>> Service updated: `, response);
      }

      // create service, if it doesn't exist
      else {
        log('>> Service does not exist, creating service');

        const serviceConfigParams = {
          stakingProgramId: stakingProgramIdToMigrateTo,
          serviceTemplate,
          deploy: true,
        };
        const response =
          await ServicesService.createService(serviceConfigParams);
        serviceConfigId = response.service_config_id;

        log(`>> Service created: `, response);
      }

      // update active staking program ID
      setActiveStakingProgramId(stakingProgramIdToMigrateTo);

      setIsMigrating(false);
      overrideSelectedServiceStatus(MiddlewareDeploymentStatus.DEPLOYING);

      // go to main page after migration
      goto(Pages.Main);
      log('>> Starting service');

      // start service after updating or creating
      assertRequired(
        serviceConfigId,
        'Service config Id has to be available before starting service',
      );
      await ServicesService.startService(serviceConfigId);

      log('>> Service started');
      setMigrationModalOpen(true);
    } catch (error) {
      setIsMigrating(false);
      message.error('Failed to switch contract, please try again.');
      console.error(error);
    } finally {
      overrideSelectedServiceStatus(null);
      setIsServicePollingPaused(false);
      setIsBalancePollingPaused(false);
    }
  }, [
    serviceTemplate,
    stakingProgramIdToMigrateTo,
    selectedService,
    setActiveStakingProgramId,
    setIsServicePollingPaused,
    setIsBalancePollingPaused,
    setMigrationModalOpen,
    overrideSelectedServiceStatus,
    goto,
    currentStakingContractId,
  ]);

  return (
    <Popover content={popoverContent}>
      <Button
        type="primary"
        size="large"
        loading={isMigrating}
        disabled={!validation.canMigrate}
        onClick={handleSwitchAndRunAgent}
      >
        Switch and run agent
      </Button>
    </Popover>
  );
};
