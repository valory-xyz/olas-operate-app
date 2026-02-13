import { Button } from 'antd';
import { useCallback, useMemo, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { MiddlewareDeploymentStatusMap } from '@/constants';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { useBalanceContext, useServices, useStakingProgram } from '@/hooks';
import { ServicesService } from '@/service/Services';
import { ServiceTemplate } from '@/types';
import { updateServiceIfNeeded } from '@/utils';

import { SwitchingContractModal } from './SwitchingContractModal';

type ConfirmSwitchButtonProps = {
  allowSwitch: boolean;
};

type ContractSwitchStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'ERROR';

export const ConfirmSwitchButton = ({
  allowSwitch,
}: ConfirmSwitchButtonProps) => {
  const [contractSwitchStatus, setContractSwitchStatus] =
    useState<ContractSwitchStatus>('NOT_STARTED');

  const {
    setPaused: setIsServicePollingPaused,
    isFetched: isServicesLoaded,
    selectedService,
    selectedAgentType,
    overrideSelectedServiceStatus,
  } = useServices();
  const { setIsPaused: setIsBalancePollingPaused } = useBalanceContext();
  const { stakingProgramIdToMigrateTo, setDefaultStakingProgramId } =
    useStakingProgram();

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

  const resetState = useCallback(() => {
    overrideSelectedServiceStatus(null);
    setIsServicePollingPaused(false);
    setIsBalancePollingPaused(false);
  }, [
    overrideSelectedServiceStatus,
    setIsServicePollingPaused,
    setIsBalancePollingPaused,
  ]);

  const handleSwitchContract = async () => {
    if (!serviceTemplate || !stakingProgramIdToMigrateTo) return;

    setContractSwitchStatus('IN_PROGRESS');
    setIsServicePollingPaused(true);
    setIsBalancePollingPaused(true);
    setDefaultStakingProgramId(stakingProgramIdToMigrateTo!);

    try {
      overrideSelectedServiceStatus(MiddlewareDeploymentStatusMap.DEPLOYING);

      if (selectedService) {
        // update service
        await updateServiceIfNeeded(
          selectedService,
          selectedAgentType,
          stakingProgramIdToMigrateTo,
        );
      } else {
        // create service if it doesn't exist
        // TODO: with the current onboarding flow this is not possible
        // Consider removing this to avoid confusion
        const serviceConfigParams = {
          stakingProgramId: stakingProgramIdToMigrateTo!,
          serviceTemplate,
          deploy: true,
        };
        await ServicesService.createService(serviceConfigParams);
      }

      // start service after updating or creating
      await ServicesService.startService(serviceConfigId);
      setContractSwitchStatus('COMPLETED');
    } catch (error) {
      console.error(error);
      setContractSwitchStatus('ERROR');
      resetState();
    }
  };

  useUnmount(() => resetState());

  return (
    <>
      <Button
        type="primary"
        size="large"
        disabled={!allowSwitch}
        loading={contractSwitchStatus === 'IN_PROGRESS'}
        onClick={handleSwitchContract}
      >
        Confirm Switch
      </Button>
      {contractSwitchStatus !== 'NOT_STARTED' && (
        <SwitchingContractModal
          status={contractSwitchStatus}
          onClose={() => setContractSwitchStatus('NOT_STARTED')}
          stakingProgramIdToMigrateTo={stakingProgramIdToMigrateTo!}
        />
      )}
    </>
  );
};
