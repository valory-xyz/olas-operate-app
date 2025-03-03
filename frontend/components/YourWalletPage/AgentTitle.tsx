import { Flex, message, Tooltip, Typography } from 'antd';
import Image from 'next/image';
import { useCallback, useMemo } from 'react';
import { useTimeout } from 'usehooks-ts';

import { MiddlewareChain } from '@/client';
import { NA, UNICODE_SYMBOLS } from '@/constants/symbols';
import { useAgentUi } from '@/context/AgentUiProvider';
import { AgentType } from '@/enums/Agent';
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

const AgentUiBrowserLink = ({ onClick }: { onClick: () => void }) => {
  return (
    <a onClick={onClick} className="text-sm" href="#">
      <AgentProfile />
    </a>
  );
};

export const AgentTitle = ({ address }: { address: Address }) => {
  const { middlewareChain } = useYourWallet();
  const { selectedAgentType, selectedService } = useServices();
  const { service, deploymentStatus } = useService(
    selectedService?.service_config_id,
  );
  const { goto, show } = useAgentUi();

  useTimeout(() => {
    if (!goto) return;

    goto('http://127.0.0.1:3003');
  }, 15000);

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
      console.log('Opening agent UI browser');
      await goto('http://127.0.0.1:8716');
      console.log('Agent UI browser opened', goto);
      await show();
    } catch (error) {
      console.log('Failed to open agent UI browser');
      message.error('Failed to open agent UI browser');
      console.error(error);
    }
    console.log('handleAgentUiBrowserLinkClick');
  }, [deploymentStatus, goto, show]);

  const agentProfileLink = useMemo(() => {
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
      return `https://www.agents.fun/services/${service.env_variables.TWIKIT_USERNAME.value ?? '#'}`;
    }

    // mode - modius
    if (
      middlewareChain === MiddlewareChain.MODE &&
      selectedAgentType === AgentType.Modius
    ) {
      return <AgentUiBrowserLink onClick={handleAgentUiBrowserLinkClick} />;
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
