import { Flex } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import { useBalanceContext } from '@/hooks/useBalanceContext';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { FirstRunModal } from '../modals/FirstRunModal';
import { AgentButton } from './AgentButton/AgentButton';
import { AgentHead } from './AgentHead';

const useSetupTrayIcon = () => {
  const { isLowBalance } = useBalanceContext();
  const { selectedService } = useServices();
  const { deploymentStatus } = useService({
    serviceConfigId: selectedService?.service_config_id,
  });
  const { setTrayIcon } = useElectronApi();

  useEffect(() => {
    if (isLowBalance) {
      setTrayIcon?.('low-gas');
    } else if (deploymentStatus === MiddlewareDeploymentStatus.DEPLOYED) {
      setTrayIcon?.('running');
    } else if (deploymentStatus === MiddlewareDeploymentStatus.STOPPED) {
      setTrayIcon?.('paused');
    } else if (deploymentStatus === MiddlewareDeploymentStatus.BUILT) {
      setTrayIcon?.('logged-out');
    }
  }, [isLowBalance, deploymentStatus, setTrayIcon]);

  return null;
};

export const MainHeader = () => {
  const [isFirstRunModalOpen, setIsFirstRunModalOpen] = useState(false);
  const handleModalClose = useCallback(() => setIsFirstRunModalOpen(false), []);

  const { selectedService } = useServices();
  const configId = selectedService?.service_config_id;
  const { isLoaded: isServiceLoaded } = useService({
    serviceConfigId: configId,
  });
  const { isActiveStakingProgramLoaded } = useStakingProgram();

  useSetupTrayIcon();
  // TODO: support loading state

  return (
    <Flex justify="start" align="center" gap={10}>
      <AgentHead />
      {isServiceLoaded && isActiveStakingProgramLoaded && <AgentButton />}
      <FirstRunModal open={isFirstRunModalOpen} onClose={handleModalClose} />
    </Flex>
  );
};
