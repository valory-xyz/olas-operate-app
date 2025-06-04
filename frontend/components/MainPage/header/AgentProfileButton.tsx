import { Button, Checkbox, Flex, message, Modal } from 'antd';
import { ReactNode, useCallback, useMemo, useState } from 'react';

import { MiddlewareChain, MiddlewareDeploymentStatus } from '@/client';
import { AgentProfileSvg } from '@/components/custom-icons/AgentProfile';
import { useYourWallet } from '@/components/YourWalletPage/useYourWallet';
import { NA } from '@/constants/symbols';
import { GEMINI_API_URL } from '@/constants/urls';
import { MODAL_WIDTH } from '@/constants/width';
import { useAgentUi } from '@/context/AgentUiProvider';
import { AgentType } from '@/enums/Agent';
import { Pages } from '@/enums/Pages';
import { useElectronApi } from '@/hooks/useElectronApi';
import { usePageState } from '@/hooks/usePageState';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { getXUsername } from '@/utils/x';

const AgentProfile = ({ onClick }: { onClick?: () => void }) => (
  <Button
    type="default"
    size="large"
    icon={<AgentProfileSvg />}
    onClick={onClick}
  />
);

const ExternalAgentProfileLink = ({ href }: { href: string }) => {
  return (
    <a href={href} target="_blank">
      <AgentProfile />
    </a>
  );
};

const BabyDegenUi = ({ onClick }: { onClick: () => void }) => {
  const electronApi = useElectronApi();
  const { selectedService, selectedAgentType } = useServices();
  const { goto } = usePageState();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const geminiApiKey = selectedService?.env_variables?.GENAI_API_KEY?.value;

  const canAccessProfile = useMemo(() => {
    if (!electronApi.store) return false;

    return (
      electronApi.store.get?.(
        `${selectedAgentType}.isProfileWarningDisplayed`,
      ) ?? false
    );
  }, [electronApi.store, selectedAgentType]);

  const handleAgentProfileClick = useCallback(() => {
    if (!!geminiApiKey || canAccessProfile) {
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
    if (selectedAgentType === AgentType.Modius) return 'Modius';
    if (selectedAgentType === AgentType.Optimus) return 'Optimus';
    return NA;
  }, [selectedAgentType]);

  return (
    <>
      <a onClick={handleAgentProfileClick} className="text-sm" href="#">
        <AgentProfile />
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

export const AgentProfileButton = () => {
  const { middlewareChain, serviceSafe } = useYourWallet();
  const { selectedAgentType, selectedService } = useServices();
  const { service, deploymentStatus } = useService(
    selectedService?.service_config_id,
  );
  const { goto, show } = useAgentUi();

  const handleAgentUiBrowserLinkClick = useCallback(async () => {
    if (!goto || !show) {
      message.error('Agent UI browser IPC methods are not available');
      return;
    }

    if (deploymentStatus !== MiddlewareDeploymentStatus.DEPLOYED) {
      message.error(
        'Please run the agent first, before attempting to view the agent UI',
      );
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

  const agentProfileLink: ReactNode | null = useMemo(() => {
    if (!serviceSafe?.address) return null;

    // gnosis - trader
    if (
      middlewareChain === MiddlewareChain.GNOSIS &&
      selectedAgentType === AgentType.PredictTrader
    ) {
      return (
        <ExternalAgentProfileLink
          href={`https://predict.olas.network/agents/${serviceSafe?.address}`}
        />
      );
    }

    // base - memeooorr
    const xUsername = getXUsername(service);
    if (
      middlewareChain === MiddlewareChain.BASE &&
      selectedAgentType === AgentType.Memeooorr
    ) {
      return (
        <ExternalAgentProfileLink
          href={`https://www.agents.fun/services/${xUsername ?? '#'}`}
        />
      );
    }

    // mode - modius
    if (
      middlewareChain === MiddlewareChain.MODE &&
      selectedAgentType === AgentType.Modius
    ) {
      return <BabyDegenUi onClick={handleAgentUiBrowserLinkClick} />;
    }

    // optimism - optimus
    if (
      middlewareChain === MiddlewareChain.OPTIMISM &&
      selectedAgentType === AgentType.Optimus
    ) {
      return <BabyDegenUi onClick={handleAgentUiBrowserLinkClick} />;
    }

    return null;
  }, [
    serviceSafe,
    handleAgentUiBrowserLinkClick,
    middlewareChain,
    selectedAgentType,
    service,
  ]);

  return agentProfileLink;
};
