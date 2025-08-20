import { Button } from 'antd';

import { AgentBusyButton } from './AgentBusyButton';
import { useServiceDeployment } from './hooks/useServiceDeployment';

/**
 * Agent Not Running Button
 */
export const AgentNotRunningButton = () => {
  const { isLoading, isDeployable, handleStart } = useServiceDeployment();

  if (isLoading) {
    return <AgentBusyButton text="Loading" />;
  }

  return (
    <Button
      type="primary"
      size="large"
      disabled={!isDeployable}
      onClick={isDeployable ? handleStart : undefined}
    >
      Start agent
    </Button>
  );
};
