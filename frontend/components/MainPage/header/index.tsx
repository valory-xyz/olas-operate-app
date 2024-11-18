import { Flex } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import { useBalance } from '@/hooks/useBalance';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';

import { FirstRunModal } from '../modals/FirstRunModal';
import { AgentButton } from './AgentButton/AgentButton';
import { AgentHead } from './AgentHead';

const useSetupTrayIcon = () => {
  const { isLowBalance } = useBalance();
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

  useSetupTrayIcon();

  return (
    <Flex justify="start" align="center" gap={10}>
      <AgentHead />
      <AgentButton />
      <FirstRunModal open={isFirstRunModalOpen} onClose={handleModalClose} />
    </Flex>
  );
};
