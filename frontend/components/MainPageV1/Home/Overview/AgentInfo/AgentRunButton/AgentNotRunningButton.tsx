import { Button } from 'antd';

import { useServiceDeployment } from '@/hooks';

import { AgentBusyButton } from './AgentBusyButton';

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
