import { Button, Flex, Typography } from 'antd';
import { isEmpty } from 'lodash';
import { useMemo } from 'react';

import { CustomAlert } from '@/components/Alert';
import { Pages } from '@/enums/Pages';
import { useElectronApi } from '@/hooks/useElectronApi';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useSharedContext } from '@/hooks/useSharedContext';

const { Text } = Typography;

// TODO: ask Product about this!
const ENV_VARS_WITH_X_ISSUES = [
  'TWIKIT_USERNAME',
  'TWIKIT_EMAIL',
  'TWIKIT_COOKIES',
];

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

export const YourAgentCannotSignIn = () => {
  const { goto } = usePageState();
  const hasHealthCheckPassed = useHealthCheck();

  if (hasHealthCheckPassed) return null;

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
