import { message } from 'antd';
import { isEmpty, uniq } from 'lodash';
import { useEffect } from 'react';

import { Pages } from '@/enums/Pages';
import { useElectronApi } from '@/hooks/useElectronApi';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useSharedContext } from '@/hooks/useSharedContext';
import { delayInSeconds } from '@/utils/delay';

/**
 * Health check hook
 */
export const useHealthCheck = () => {
  const { deploymentDetails, selectedService } = useServices();
  const { goto: gotoPage } = usePageState();
  const { showNotification } = useElectronApi();
  const { healthCheckErrorsShownToUser, updateHealthCheckErrors } =
    useSharedContext();

  const serviceId = selectedService?.service_config_id;

  useEffect(() => {
    const checkHealth = async () => {
      if (!serviceId) return true;
      if (!deploymentDetails) return true;

      try {
        const healthcheck = deploymentDetails.healthcheck;
        if (isEmpty(healthcheck) || !healthcheck.env_var_status?.needs_update) {
          return true;
        }

        // Unique errors
        const envVarsErrors = uniq(
          Object.values(healthcheck.env_var_status?.env_vars || {}),
        );
        const notShownErrors = envVarsErrors.filter(
          (error) => !healthCheckErrorsShownToUser.includes(error),
        );

        if (notShownErrors.length === 0) return true;

        const firstError = notShownErrors[0];
        updateHealthCheckErrors(firstError);
        showNotification?.(firstError);
        message.error(firstError);

        await delayInSeconds(2); // wait for the notification to show
        message.loading('Redirecting to the settings page...', 2);
        await delayInSeconds(4); // wait before redirecting
        gotoPage(Pages.UpdateAgentTemplate);
        return false;
      } catch (error) {
        console.error('Health check failed:', error);
        throw error;
      }
    };

    checkHealth();
  }, [
    gotoPage,
    showNotification,
    deploymentDetails,
    serviceId,
    healthCheckErrorsShownToUser,
    updateHealthCheckErrors,
  ]);
};
