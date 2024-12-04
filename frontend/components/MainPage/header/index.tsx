import { QuestionCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Flex } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import { CardSection } from '@/components/styled/CardSection';
import { Pages } from '@/enums/Pages';
import { useBalanceContext } from '@/hooks/useBalanceContext';
import { useElectronApi } from '@/hooks/useElectronApi';
import { usePageState } from '@/hooks/usePageState';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';

import { FirstRunModal } from '../modals/FirstRunModal';
import { AgentButton } from './AgentButton/AgentButton';
import { AgentHead } from './AgentHead';

const useSetupTrayIcon = () => {
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

export const MainHeader = () => {
  const { goto } = usePageState();

  const [isFirstRunModalOpen, setIsFirstRunModalOpen] = useState(false);
  const handleModalClose = useCallback(() => setIsFirstRunModalOpen(false), []);

  useSetupTrayIcon();
  // TODO: support loading state

  return (
    <CardSection gap={8} padding="8px 24px" justify="space-between">
      <Flex justify="start" align="center" gap={10}>
        <AgentHead />
        <AgentButton />
        <FirstRunModal open={isFirstRunModalOpen} onClose={handleModalClose} />
      </Flex>

      <Flex gap={8} align="center">
        <Button
          type="default"
          size="large"
          icon={<QuestionCircleOutlined />}
          onClick={() => goto(Pages.HelpAndSupport)}
        />
        <Button
          type="default"
          size="large"
          icon={<SettingOutlined />}
          onClick={() => goto(Pages.Settings)}
        />
      </Flex>
    </CardSection>
  );
};
