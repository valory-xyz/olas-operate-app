import { useEffect } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import {
  useBalanceAndRefillRequirementsContext,
  useElectronApi,
  useService,
  useServices,
} from '@/hooks';

export const useSetupTrayIcon = () => {
  const { setTrayIcon } = useElectronApi();
  const { selectedService } = useServices();
  const { deploymentStatus } = useService(selectedService?.service_config_id);
  const { isPearlWalletRefillRequired } =
    useBalanceAndRefillRequirementsContext();

  useEffect(() => {
    if (!setTrayIcon) return;

    if (isPearlWalletRefillRequired) {
      setTrayIcon('low-gas');
    } else if (deploymentStatus === MiddlewareDeploymentStatus.DEPLOYED) {
      setTrayIcon('running');
    } else if (deploymentStatus === MiddlewareDeploymentStatus.STOPPED) {
      setTrayIcon('paused');
    } else if (deploymentStatus === MiddlewareDeploymentStatus.BUILT) {
      setTrayIcon('logged-out');
    }
  }, [isPearlWalletRefillRequired, deploymentStatus, setTrayIcon]);
};
