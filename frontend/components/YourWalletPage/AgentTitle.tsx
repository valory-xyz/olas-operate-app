import { Flex, message, Modal, Tooltip, Typography } from 'antd';
import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';

import { MiddlewareChain } from '@/client';
import { NA, UNICODE_SYMBOLS } from '@/constants/symbols';
import { GEMINI_API_URL } from '@/constants/urls';
import { useAgentUi } from '@/context/AgentUiProvider';
import { AgentType } from '@/enums/Agent';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { Address } from '@/types/Address';
import { generateName } from '@/utils/agentName';

import { useYourWallet } from './useYourWallet';

const { Text, Paragraph } = Typography;

const AgentProfile = () => <>Agent profile {UNICODE_SYMBOLS.EXTERNAL_LINK}</>;

const ExternalAgentProfileLink = ({ href }: { href: string }) => {
  return (
    <a href={href} target="_blank" className="text-sm">
      <AgentProfile />
    </a>
  );
};

const ModiusAgentProfile = ({ onClick }: { onClick: () => void }) => {
  const { selectedService } = useServices();
  const { goto } = usePageState();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const geminiApiKey = selectedService?.env_variables?.GENAI_API_KEY?.value;

  const handleAgentProfileClick = useCallback(() => {
    if (!geminiApiKey) {
      setIsModalOpen(true);
      return;
    }

    onClick();
  }, [geminiApiKey, onClick]);

  const handleOk = useCallback(() => {
    setIsModalOpen(false);
    goto(Pages.UpdateAgentTemplate);
  }, [goto]);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    onClick();
  }, [onClick]);

  return (
    <>
      <a onClick={handleAgentProfileClick} className="text-sm" href="#">
        <AgentProfile />
      </a>
      <Modal
        title="Provide Gemini API Key"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="Provide Gemini API key"
        cancelText="Proceed anyway"
      >
        To unlock the full functionality of Modius profile, a Gemini API key is
        required. You can get a free Gemini API key through the{' '}
        <a target="_blank" href={GEMINI_API_URL}>
          Google AI Studio
        </a>
        .
      </Modal>
    </>
  );
};

export const AgentTitle = ({ address }: { address: Address }) => {
  const { middlewareChain } = useYourWallet();
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

    // if (deploymentStatus !== MiddlewareDeploymentStatus.DEPLOYED) {
    //   message.error(
    //     'Please run the agent first, before attempting to view the agent UI',
    //   );
    //   return;
    // }

    try {
      await goto('http://127.0.0.1:8716');
      show();
    } catch (error) {
      message.error('Failed to open agent UI browser');
      console.error(error);
    }
  }, [deploymentStatus, goto, show]);

  const agentProfileLink: JSX.Element | null = useMemo(() => {
    if (!address) return null;

    // gnosis - trader
    if (
      middlewareChain === MiddlewareChain.GNOSIS &&
      selectedAgentType === AgentType.PredictTrader
    ) {
      return (
        <ExternalAgentProfileLink
          href={`https://predict.olas.network/agents/${address}`}
        />
      );
    }

    // base - memeooorr
    if (
      middlewareChain === MiddlewareChain.BASE &&
      selectedAgentType === AgentType.Memeooorr &&
      service?.env_variables?.TWIKIT_USERNAME?.value
    ) {
      return (
        <ExternalAgentProfileLink
          href={`https://www.agents.fun/services/${service.env_variables.TWIKIT_USERNAME.value ?? '#'}`}
        />
      );
    }

    // mode - modius
    if (
      middlewareChain === MiddlewareChain.MODE &&
      selectedAgentType === AgentType.Modius
    ) {
      return <ModiusAgentProfile onClick={handleAgentUiBrowserLinkClick} />;
    }

    return null;
  }, [
    address,
    handleAgentUiBrowserLinkClick,
    middlewareChain,
    selectedAgentType,
    service?.env_variables?.TWIKIT_USERNAME?.value,
  ]);

  return (
    <Flex vertical gap={12}>
      <Flex gap={12}>
        <Image
          width={36}
          height={36}
          alt="Agent wallet"
          src="/agent-wallet.png"
        />

        <Flex vertical className="w-full">
          <Text className="m-0 text-sm" type="secondary">
            Your agent
          </Text>
          <Flex justify="space-between">
            <Tooltip
              arrow={false}
              title={
                <Paragraph className="text-sm m-0">
                  This is your agent&apos;s unique name
                </Paragraph>
              }
              placement="top"
            >
              <Text strong>{address ? generateName(address) : NA}</Text>
            </Tooltip>

            {agentProfileLink}
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};
