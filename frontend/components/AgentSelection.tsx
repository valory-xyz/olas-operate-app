import { Button, Card, CardProps, Flex, Typography } from 'antd';
import { entries } from 'lodash';
import Image from 'next/image';
import { memo, useCallback } from 'react';

import { AGENT_CONFIG } from '@/config/agents';
import { COLOR } from '@/constants/colors';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { AgentType } from '@/enums/Agent';
import { Pages } from '@/enums/Pages';
import { SetupScreen } from '@/enums/SetupScreen';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useSetup } from '@/hooks/useSetup';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { AgentConfig } from '@/types/Agent';
import { delayInSeconds } from '@/utils/delay';

import { SetupCreateHeader } from './SetupPage/Create/SetupCreateHeader';
import { CardFlex } from './styled/CardFlex';

const { Title, Text } = Typography;

const getCardStyle = (isCurrentAgent: boolean): CardProps['style'] =>
  isCurrentAgent
    ? { borderColor: COLOR.PURPLE_LIGHT, backgroundColor: COLOR.PURPLE_LIGHT_2 }
    : {};

const getCardStyles = (isCurrentAgent: boolean): CardProps['styles'] => ({
  header: isCurrentAgent
    ? {
        padding: 4,
        minHeight: 0,
        backgroundColor: COLOR.PURPLE_LIGHT_2,
        color: COLOR.PURPLE,
        textAlign: 'center',
        fontSize: 'inherit',
        borderColor: 'transparent',
      }
    : {},
  body: {
    gap: 6,
    padding: isCurrentAgent ? '8px 16px 12px 16px' : '12px 16px',
    borderRadius: 'inherit',
    backgroundColor: isCurrentAgent ? COLOR.WHITE : undefined,
  },
});

type EachAgentProps = {
  showSelected: boolean;
  agentType: AgentType;
  agentConfig: AgentConfig;
};

const EachAgent = memo(
  ({ showSelected, agentType, agentConfig }: EachAgentProps) => {
    const { goto: gotoSetup } = useSetup();
    const { goto: gotoPage } = usePageState();
    const {
      isLoading: isServicesLoading,
      services,
      selectedAgentType,
      updateAgentType,
    } = useServices();
    const { masterSafes, isLoading: isMasterWalletLoading } =
      useMasterWalletContext();

    const isCurrentAgent = showSelected
      ? selectedAgentType === agentType
      : false;

    const handleSelectAgent = useCallback(async () => {
      updateAgentType(agentType);

      // DO NOTE REMOVE THIS DELAY
      // NOTE: the delay is added so that agentType is updated in electron store
      // and re-rendered with the updated agentType
      await delayInSeconds(0.5);

      const isSafeCreated = masterSafes?.find(
        (masterSafe) =>
          masterSafe.evmChainId === AGENT_CONFIG[agentType].evmHomeChainId,
      );

      // If safe is created for the agent type, then go to main page
      if (isSafeCreated) {
        gotoPage(Pages.Main);
        return;
      }

      const serviceName = SERVICE_TEMPLATES.find(
        (service) => service.agentType === agentType,
      )?.name;
      const isServiceCreated = services?.find(
        ({ name }) => name === serviceName,
      );

      // If service is created but safe is NOT, then setup EOA funding
      // Eg. This case will happen when the user has created the service and closed the app on/during funding page.
      if (isServiceCreated) {
        gotoPage(Pages.Setup);
        gotoSetup(SetupScreen.SetupEoaFunding);
        return;
      }

      // Neither service nor safe is created
      if (
        agentType === AgentType.Memeooorr ||
        agentType === AgentType.Modius ||
        agentType === AgentType.AgentsFunCelo ||
        agentType == AgentType.Langchain
      ) {
        // if the selected type requires setting up an agent - should redirect to SetupYourAgent first
        // TODO: can have this as a boolean flag in agentConfig?
        gotoPage(Pages.Setup);
        gotoSetup(SetupScreen.SetupYourAgent);
        return;
      }

      if (agentType === AgentType.PredictTrader) {
        gotoPage(Pages.Setup);
        gotoSetup(SetupScreen.SetupEoaFunding);
        return;
      }

      throw new Error('Invalid agent type');
    }, [
      services,
      agentType,
      gotoPage,
      gotoSetup,
      masterSafes,
      updateAgentType,
    ]);

    return (
      <Card
        key={agentType}
        style={getCardStyle(isCurrentAgent)}
        styles={getCardStyles(isCurrentAgent)}
        title={isCurrentAgent ? 'Current agent' : undefined}
      >
        <Flex vertical>
          <Flex align="center" justify="space-between" className="mb-8">
            <Image
              src={`/agent-${agentType}-icon.png`}
              width={36}
              height={36}
              alt={agentConfig.displayName}
            />

            <Button
              type="primary"
              onClick={handleSelectAgent}
              disabled={isServicesLoading || isMasterWalletLoading}
            >
              Select
            </Button>
          </Flex>
        </Flex>

        <Title level={5} className="m-0">
          {agentConfig.displayName}
        </Title>

        <Text type="secondary">{agentConfig.description}</Text>
      </Card>
    );
  },
);
EachAgent.displayName = 'EachAgent';

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

    {entries(AGENT_CONFIG)
      .filter(([, agentConfig]) => {
        return !!agentConfig.isAgentEnabled;
      })
      .map(([agentType, agentConfig]) => {
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
