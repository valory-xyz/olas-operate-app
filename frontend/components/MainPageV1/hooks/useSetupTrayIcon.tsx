import { useEffect } from 'react';

import { MiddlewareDeploymentStatusMap } from '@/constants';
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
    } else if (deploymentStatus === MiddlewareDeploymentStatusMap.DEPLOYED) {
      setTrayIcon('running');
    } else if (deploymentStatus === MiddlewareDeploymentStatusMap.STOPPED) {
      setTrayIcon('paused');
    } else if (deploymentStatus === MiddlewareDeploymentStatusMap.BUILT) {
      setTrayIcon('logged-out');
    }
  }, [isPearlWalletRefillRequired, deploymentStatus, setTrayIcon]);
};
