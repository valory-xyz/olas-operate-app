import { Button, Popover } from 'antd';
import { isNil } from 'lodash';
import { useMemo } from 'react';

import { MiddlewareDeploymentStatus, ServiceTemplate } from '@/client';
import {
  getServiceTemplate,
  SERVICE_TEMPLATES,
} from '@/constants/serviceTemplates';
import { Pages } from '@/enums/Pages';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useBalanceContext } from '@/hooks/useBalanceContext';
import { useModals } from '@/hooks/useModals';
import { usePageState } from '@/hooks/usePageState';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import {
  useActiveStakingContractInfo,
  useStakingContractDetails,
} from '@/hooks/useStakingContractDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';
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
  const {
    setPaused: setIsServicePollingPaused,
    isFetched: isServicesLoaded,
    selectedService,
    selectedAgentConfig,
    selectedAgentType,
    overrideSelectedServiceStatus,
  } = useServices();
  const { evmHomeChainId: homeChainId } = selectedAgentConfig;
  const serviceConfigId =
    isServicesLoaded && selectedService
      ? selectedService.service_config_id
      : '';
  const { service } = useService(serviceConfigId);
  const serviceTemplate = useMemo<ServiceTemplate | undefined>(
    () =>
      service
        ? getServiceTemplate(service.hash)
        : SERVICE_TEMPLATES.find(
            (template) => template.agentType === selectedAgentType,
          ),
    [selectedAgentType, service],
  );

  const { setIsPaused: setIsBalancePollingPaused } = useBalanceContext();

  const { defaultStakingProgramId, setDefaultStakingProgramId } =
    useStakingProgram();
  const {
    selectedStakingContractDetails,
    isSelectedStakingContractDetailsLoaded,
  } = useActiveStakingContractInfo();
  const { stakingContractInfo: defaultStakingContractInfo } =
    useStakingContractDetails(defaultStakingProgramId);

  const currentStakingContractInfo = useMemo(() => {
    if (!isSelectedStakingContractDetailsLoaded) return;
    if (selectedStakingContractDetails) return selectedStakingContractDetails;
    return defaultStakingContractInfo;
  }, [
    selectedStakingContractDetails,
    defaultStakingContractInfo,
    isSelectedStakingContractDetailsLoaded,
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

            const serviceConfigParams = {
              stakingProgramId: stakingProgramIdToMigrateTo,
              serviceTemplate,
              deploy: true,
              useMechMarketplace:
                stakingProgramIdToMigrateTo ===
                StakingProgramId.PearlBetaMechMarketplace,
              chainId: homeChainId,
            };

            if (selectedService) {
              // update service
              await ServicesService.updateService({
                ...serviceConfigParams,
                serviceConfigId,
              });
            } else {
              // create service if it doesn't exist
              await ServicesService.createService(serviceConfigParams);
            }

            // start service after updating or creating
            await ServicesService.startService(serviceConfigId);

            setMigrationModalOpen(true);
          } catch (error) {
            console.error(error);
          } finally {
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
