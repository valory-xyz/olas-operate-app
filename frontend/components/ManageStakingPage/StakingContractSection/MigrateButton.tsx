import { Button, Popover } from 'antd';
import { isNil } from 'lodash';
import { useMemo } from 'react';

import { MiddlewareDeploymentStatus, ServiceTemplate } from '@/client';
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
import { asMiddlewareChain } from '@/utils/middlewareHelpers';
import { isValidServiceId } from '@/utils/service';

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
    selectedAgentConfig,
    overrideSelectedServiceStatus,
  } = useServices();
  const serviceConfigId =
    isServicesLoaded && selectedService
      ? selectedService.service_config_id
      : '';
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

    // check if the service is deployed (has service id assigned)
    const currentChainId = selectedAgentConfig.evmHomeChainId;
    const chainData = !isNil(selectedService?.chain_configs)
      ? selectedService?.chain_configs?.[asMiddlewareChain(currentChainId)]
          ?.chain_data
      : null;
    const token = chainData?.token;

    if (selectedService && isValidServiceId(token)) return false;

    return true;
  }, [isServicesLoaded, selectedAgentConfig.evmHomeChainId, selectedService]);

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
          if (!serviceTemplate) return;

          setIsServicePollingPaused(true);
          setIsBalancePollingPaused(true);
          setDefaultStakingProgramId(stakingProgramIdToMigrateTo);

          // TODO: we should not get the default staking program id
          // from the context, we should get it from the service
          // setDefaultStakingProgramId(stakingProgramId);

          try {
            overrideSelectedServiceStatus(MiddlewareDeploymentStatus.DEPLOYING);
            goto(Pages.Main);

            if (selectedService) {
              // update service
              await ServicesService.updateService({
                serviceConfigId,
                partialServiceTemplate: {
                  configurations: {
                    ...Object.entries(serviceTemplate.configurations).reduce(
                      (acc, [middlewareChain]) => {
                        // @ts-expect-error TODO: to be fixed
                        acc[middlewareChain] = {
                          staking_program_id: stakingProgramIdToMigrateTo,
                        };
                        return acc;
                      },
                      {} as DeepPartial<typeof serviceTemplate.configurations>,
                    ),
                  },
                },
              });
            } else {
              // create service if it doesn't exist
              const serviceConfigParams = {
                stakingProgramId: stakingProgramIdToMigrateTo,
                serviceTemplate,
                deploy: true,
              };
              await ServicesService.createService(serviceConfigParams);
            }

            // start service after updating or creating
            await ServicesService.startService(serviceConfigId);

            setMigrationModalOpen(true);
          } catch (error) {
            console.error(error);
          } finally {
            overrideSelectedServiceStatus(null);
            setIsServicePollingPaused(false);
            setIsBalancePollingPaused(false);
          }
        }}
      >
        Switch and run agent
      </Button>
    </Popover>
  );
};
