import { message } from 'antd';
import { isEmpty } from 'lodash';
import { useEffect } from 'react';

import { AgentType } from '@/enums/Agent';
import { Pages } from '@/enums/Pages';
import { useElectronApi } from '@/hooks/useElectronApi';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { delayInSeconds } from '@/utils/delay';

const UNABLE_TO_SIGN_IN_TO_X =
  'Your agent cannot sign in to X. Please check that your credentials are correct or verify if your X account has been suspended.';

/**
 * Health check hook
 */
export const useHealthCheck = () => {
  const { selectedAgentType, deploymentDetails, selectedService } =
    useServices();
  const { goto: gotoPage } = usePageState();
  const { showNotification } = useElectronApi();

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

        if (selectedAgentType !== AgentType.Memeooorr) {
          return true;
        }

        const isXSuspended =
          healthcheck.env_var_status?.env_vars?.['TWIKIT_COOKIES']?.includes(
            'suspended',
          );

        if (isXSuspended) {
          showNotification?.(UNABLE_TO_SIGN_IN_TO_X);
          message.error(UNABLE_TO_SIGN_IN_TO_X);
          await delayInSeconds(2); // wait for the notification to show
          message.loading('Redirecting to the settings page...', 2);
          await delayInSeconds(4); // wait before redirecting
          gotoPage(Pages.UpdateAgentTemplate);
          return false;
        }
      } catch (error) {
        console.error('Health check failed:', error);
        throw error;
      }
    };

    checkHealth();
  }, [
    gotoPage,
    selectedAgentType,
    showNotification,
    deploymentDetails,
    serviceId,
  ]);
};
