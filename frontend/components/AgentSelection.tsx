import { Button, Card, Flex, Typography } from 'antd';
import { entries } from 'lodash';
import Image from 'next/image';
import { useCallback } from 'react';

import { AGENT_CONFIG } from '@/config/agents';
import { COLOR } from '@/constants/colors';
import { AgentType } from '@/enums/Agent';
import { Pages } from '@/enums/Pages';
import { SetupScreen } from '@/enums/SetupScreen';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useSetup } from '@/hooks/useSetup';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { AgentConfig } from '@/types/Agent';

import { SetupCreateHeader } from './SetupPage/Create/SetupCreateHeader';
import { CardFlex } from './styled/CardFlex';

const { Title, Text } = Typography;

type EachAgentProps = {
  showSelected: boolean;
  agentType: AgentType;
  agentConfig: AgentConfig;
};

const EachAgent = ({
  showSelected,
  agentType,
  agentConfig,
}: EachAgentProps) => {
  const { goto: gotoSetup } = useSetup();
  const { goto: gotoPage } = usePageState();
  const { selectedAgentType, updateAgentType } = useServices();
  const { masterSafes, isLoading } = useMasterWalletContext();

  const isCurrentAgent = showSelected ? selectedAgentType === agentType : false;

  const handleSelectAgent = useCallback(() => {
    updateAgentType(agentType);

    const isSafeCreated = masterSafes?.find(
      (masterSafe) =>
        masterSafe.evmChainId === AGENT_CONFIG[agentType].evmHomeChainId,
    );

    if (isSafeCreated) {
      gotoPage(Pages.Main);
    } else {
      if (agentType === AgentType.Memeooorr) {
        // if the selected type is Memeooorr - should set up the agent first
        gotoPage(Pages.Setup);
        gotoSetup(SetupScreen.SetupYourAgent);
      } else if (agentType === AgentType.PredictTrader) {
        gotoPage(Pages.Setup);
        gotoSetup(SetupScreen.SetupEoaFunding);
      }
    }
  }, [agentType, gotoPage, gotoSetup, masterSafes, updateAgentType]);

  return (
    <Card
      key={agentType}
      style={{ padding: 0, marginBottom: 6 }}
      styles={{
        body: {
          padding: '12px 16px',
          gap: 6,
          borderRadius: 'inherit',
          background: isCurrentAgent ? COLOR.GRAY_1 : 'transparent',
          opacity: isCurrentAgent ? 0.75 : 1,
        },
      }}
    >
      <Flex vertical>
        <Flex align="center" justify="space-between" className="mb-8">
          <Image
            src={`/agent-${agentType}-icon.png`}
            width={36}
            height={36}
            alt={agentConfig.displayName}
          />
          {isCurrentAgent ? (
            <Text>Selected Agent</Text>
          ) : (
            <Button
              type="primary"
              onClick={handleSelectAgent}
              disabled={isLoading}
            >
              Select
            </Button>
          )}
        </Flex>
      </Flex>

      <Title level={5} className="m-0">
        {agentConfig.displayName}
      </Title>

      <Text type="secondary">{agentConfig.description}</Text>
    </Card>
  );
};

type AgentSelectionProps = {
  showSelected?: boolean;
  canGoBack?: boolean;
  onPrev?: () => void;
};

/**
 * Component to select the agent type.
 */
export const AgentSelection = ({
  showSelected = true,
  onPrev,
}: AgentSelectionProps) => (
  <CardFlex gap={10} styles={{ body: { padding: '12px 24px' } }}>
    <SetupCreateHeader prev={onPrev} />
    <Title level={3}>Select your agent</Title>

    {entries(AGENT_CONFIG).map(([agentType, agentConfig]) => {
      return (
        <EachAgent
          key={agentType}
          showSelected={showSelected}
          agentType={agentType as AgentType}
          agentConfig={agentConfig}
        />
      );
    })}
  </CardFlex>
);
