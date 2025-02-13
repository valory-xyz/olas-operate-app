import { Button, Flex, Typography } from 'antd';
import { isEmpty } from 'lodash';
import { useMemo } from 'react';

import { CustomAlert } from '@/components/Alert';
import { Pages } from '@/enums/Pages';
import { useElectronApi } from '@/hooks/useElectronApi';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';

const { Text, Title } = Typography;

const envVarsWithXIssues = [
  'TWIKIT_USERNAME',
  'TWIKIT_EMAIL',
  'TWIKIT_COOKIES',
];

/**
 * Health check hook
 */
export const useHealthCheck = () => {
  const { deploymentDetails, selectedService } = useServices();
  const { showNotification } = useElectronApi();

  const serviceId = selectedService?.service_config_id;

  return useMemo(() => {
    if (!serviceId) return true;
    if (!deploymentDetails) return true;

    try {
      const healthcheck = deploymentDetails.healthcheck;
      if (isEmpty(healthcheck) || !healthcheck.env_var_status?.needs_update) {
        return true;
      }

      const envVarsKeys = Object.keys(
        healthcheck.env_var_status?.env_vars || {},
      );

      const isEnvVarWithXIssues = envVarsKeys.some((key) =>
        envVarsWithXIssues.includes(key),
      );
      if (!isEnvVarWithXIssues) return true;

      showNotification?.(
        'Your agent cannot sign in to X. Please check that your credentials are correct or verify if your X account has been suspended.',
      );

      return false;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }, [deploymentDetails, serviceId, showNotification]);
};

export const YourAgentCannotSignIn = () => {
  const { goto } = usePageState();

  return (
    <CustomAlert
      type="warning"
      fullWidth
      showIcon
      message={
        <Flex justify="space-between" align="flex-start" gap={4} vertical>
          <Text className="font-weight-600">
            Your agent cannot sign in to X
          </Text>

          <Title level={5} style={{ margin: 0, display: 'none' }}>
            Your agent cannot sign in to X
          </Title>

          <Text className="text-sm">
            Check your X credentials in Pearl and verify if your X account has
            been suspended. If suspended, create a new X account and update your
            credentials in Pearl.
          </Text>

          <Button
            type="default"
            size="small"
            onClick={() => goto(Pages.UpdateAgentTemplate)}
            className="mt-4"
          >
            View credentials
          </Button>
        </Flex>
      }
    />
  );
};
