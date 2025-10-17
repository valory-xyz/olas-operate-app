import { useEffect } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import {
  useBalanceContext,
  useElectronApi,
  useService,
  useServices,
} from '@/hooks';

export const useSetupTrayIcon = () => {
  const { isLowBalance } = useBalanceContext();
  const { selectedService } = useServices();
  const { deploymentStatus } = useService(selectedService?.service_config_id);
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
