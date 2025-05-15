import { isEmpty } from 'lodash';
import { useMemo } from 'react';

import { useElectronApi } from '@/hooks/useElectronApi';
import { useServices } from '@/hooks/useServices';
import { useSharedContext } from '@/hooks/useSharedContext';

const ENV_VARS_WITH_X_ISSUES = ['TWIKIT_USERNAME'];

export const useHealthCheck = () => {
  const { deploymentDetails } = useServices();
  const { showNotification } = useElectronApi();
  const { isHealthCheckAlertShown, setHealthCheckAlertShown } =
    useSharedContext();

  return useMemo(() => {
    if (!deploymentDetails || isEmpty(deploymentDetails)) {
      return true;
    }

    const { healthcheck } = deploymentDetails;
    if (isEmpty(healthcheck) || !healthcheck.env_var_status?.needs_update) {
      return true;
    }

    const envVarsKeys = Object.keys(healthcheck.env_var_status?.env_vars || {});
    const hasIssues = envVarsKeys.some((key) =>
      ENV_VARS_WITH_X_ISSUES.includes(key),
    );
    if (!hasIssues) return true;

    if (!isHealthCheckAlertShown) {
      setHealthCheckAlertShown(true);
      showNotification?.(
        'Your agent cannot sign in to X. Please check that your credentials are correct or verify if your X account has been suspended.',
      );
    }
    return false;
  }, [
    deploymentDetails,
    showNotification,
    isHealthCheckAlertShown,
    setHealthCheckAlertShown,
  ]);
};
