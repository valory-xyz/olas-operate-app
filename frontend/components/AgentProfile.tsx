import { Button, Checkbox, Flex, message, Modal } from 'antd';
import { isBoolean } from 'lodash';
import { ReactNode, useCallback, useMemo, useState } from 'react';

import { MiddlewareChain, MiddlewareDeploymentStatus } from '@/client';
import { AgentProfileSvg } from '@/components/custom-icons/AgentProfile';
import { useYourWallet } from '@/components/YourWalletPage/useYourWallet';
import { NA } from '@/constants/symbols';
import { GEMINI_API_URL } from '@/constants/urls';
import { MESSAGE_WIDTH, MODAL_WIDTH } from '@/constants/width';
import { useAgentUi } from '@/context/AgentUiProvider';
import { AgentType } from '@/enums/Agent';
import { Pages } from '@/enums/Pages';
import { useElectronApi } from '@/hooks/useElectronApi';
import { usePageState } from '@/hooks/usePageState';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';

type RenderContainerProps = (props: { onClick?: () => void }) => ReactNode;

type AgentProfileButtonProps = {
  onClick?: () => void;
  renderContainer?: RenderContainerProps;
};

const AgentProfileButton = ({
  onClick,
  renderContainer,
}: AgentProfileButtonProps) => {
  if (renderContainer) {
    return renderContainer({ onClick });
  }

  return (
    <Button
      type="default"
      size="large"
      icon={<AgentProfileSvg />}
      onClick={onClick}
    />
  );
};

type AgentUiProps = {
  onClick: () => void;
  renderContainer?: RenderContainerProps;
};

const AgentUi = ({ onClick, renderContainer }: AgentUiProps) => {
  const electronApi = useElectronApi();
  const { selectedService, selectedAgentType } = useServices();
  const { goto } = usePageState();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const geminiApiKey = selectedService?.env_variables?.GENAI_API_KEY?.value;

  const canAccessProfile = useMemo(() => {
    if (!electronApi.store) return false;

    const key = `${selectedAgentType}.isProfileWarningDisplayed`;
    return electronApi.store.get?.(key) ?? false;
  }, [electronApi.store, selectedAgentType]);

  const handleAgentProfileClick = useCallback(async () => {
    const canAccess = isBoolean(canAccessProfile)
      ? canAccessProfile
      : await canAccessProfile;

    if (!!geminiApiKey || canAccess) {
      onClick();
      return;
    }

    setIsModalOpen(true);
  }, [geminiApiKey, canAccessProfile, onClick]);

  const handleDoNotShowAgain = useCallback(
    (value: boolean) => {
      const key = `${selectedAgentType}.isProfileWarningDisplayed`;
      electronApi.store?.set?.(key, value);
      setIsModalOpen(false);
    },
    [electronApi.store, selectedAgentType],
  );

  const handleProvideKey = useCallback(() => {
    handleDoNotShowAgain(dontShowAgain);
    goto(Pages.UpdateAgentTemplate);
  }, [dontShowAgain, handleDoNotShowAgain, goto]);

  const handleProceed = useCallback(() => {
    handleDoNotShowAgain(dontShowAgain);
    onClick();
  }, [dontShowAgain, handleDoNotShowAgain, onClick]);

  const agentName = useMemo(() => {
    if (selectedAgentType === AgentType.PredictTrader) return 'Prediction';
    if (selectedAgentType === AgentType.Modius) return 'Modius';
    if (selectedAgentType === AgentType.Optimus) return 'Optimus';
    return NA;
  }, [selectedAgentType]);

  return (
    <>
      <a onClick={handleAgentProfileClick} className="text-sm" href="#">
        <AgentProfileButton renderContainer={renderContainer} />
      </a>
      <Modal
        title="Provide Gemini API Key"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={MODAL_WIDTH}
        footer={null}
      >
        <Flex vertical gap={20}>
          <div>
            To unlock the full functionality of {agentName} profile, a Gemini
            API key is required. You can get a free Gemini API key through the{' '}
            <a target="_blank" rel="noopener noreferrer" href={GEMINI_API_URL}>
              Google AI Studio
            </a>
            .
          </div>

          <Flex align="center" gap={8}>
            <Checkbox onChange={(e) => setDontShowAgain(e.target.checked)}>
              {"Don't show again"}
            </Checkbox>
          </Flex>

          <Flex gap={8}>
            <Button onClick={handleProceed}>Proceed anyway</Button>
            <Button type="primary" onClick={handleProvideKey}>
              Provide Gemini API key
            </Button>
          </Flex>
        </Flex>
      </Modal>
    </>
  );
};

type AgentProfileProps = { renderContainer?: RenderContainerProps };

/**
 * Displays the agent profile container based on the selected agent type and middleware chain.
 * And provides a link to the agent UI.
 */
export const AgentProfile = ({ renderContainer }: AgentProfileProps) => {
  const { middlewareChain, serviceSafe } = useYourWallet();
  const { selectedAgentType, selectedService } = useServices();
  const { deploymentStatus } = useService(selectedService?.service_config_id);
  const { goto, show } = useAgentUi();

  const handleAgentUiBrowserLinkClick = useCallback(async () => {
    if (!goto || !show) {
      message.error('Agent UI browser IPC methods are not available');
      return;
    }

    if (deploymentStatus !== MiddlewareDeploymentStatus.DEPLOYED) {
      message.open({
        type: 'error',
        content:
          'Please run the agent first, before attempting to view the agent UI',
        style: { maxWidth: MESSAGE_WIDTH, margin: '0 auto' },
      });
      return;
    }

    try {
      await goto('http://127.0.0.1:8716');
      show();
    } catch (error) {
      message.error('Failed to open agent UI browser');
      console.error(error);
    }
  }, [deploymentStatus, goto, show]);

  const commonProps = useMemo(
    () => ({
      onClick: handleAgentUiBrowserLinkClick,
      renderContainer,
    }),
    [handleAgentUiBrowserLinkClick, renderContainer],
  );

  const agentProfileLink: ReactNode | null = useMemo(() => {
    if (!serviceSafe?.address) return null;

    // gnosis - trader
    if (
      middlewareChain === MiddlewareChain.GNOSIS &&
      selectedAgentType === AgentType.PredictTrader
    ) {
      return <AgentUi {...commonProps} />;
    }

    // base - agentsFun
    if (
      middlewareChain === MiddlewareChain.BASE &&
      selectedAgentType === AgentType.AgentsFun
    ) {
      return <AgentProfileButton {...commonProps} />;
    }

    // mode - modius
    if (
      middlewareChain === MiddlewareChain.MODE &&
      selectedAgentType === AgentType.Modius
    ) {
      return <AgentUi {...commonProps} />;
    }

    // optimism - optimus
    if (
      middlewareChain === MiddlewareChain.OPTIMISM &&
      selectedAgentType === AgentType.Optimus
    ) {
      return <AgentUi {...commonProps} />;
    }

    return null;
  }, [serviceSafe, middlewareChain, selectedAgentType, commonProps]);

  return agentProfileLink;
};
