import { Button, Card, CardProps, Flex, Typography } from 'antd';
import { entries } from 'lodash';
import Image from 'next/image';
import { memo, useCallback, useMemo } from 'react';

import { AGENT_CONFIG } from '@/config/agents';
import { COLOR } from '@/constants/colors';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { AgentType } from '@/enums/Agent';
import { Pages } from '@/enums/Pages';
import { SetupScreen } from '@/enums/SetupScreen';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useSetup } from '@/hooks/useSetup';
import { useSharedContext } from '@/hooks/useSharedContext';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { AgentConfig } from '@/types/Agent';
import { delayInSeconds } from '@/utils/delay';

import { SetupCreateHeader } from './SetupPage/Create/SetupCreateHeader';
import { CardFlex } from './styled/CardFlex';

const { Title, Text } = Typography;

const getCardStyle = (
  isCurrentAgent: boolean,
  isUnderConstruction: boolean,
): CardProps['style'] => {
  if (isCurrentAgent && !isUnderConstruction)
    return {
      borderColor: COLOR.PURPLE_LIGHT,
      backgroundColor: COLOR.PURPLE_LIGHT_2,
    };

  return {};
};

const getCardStyles = (
  isCurrentAgent: boolean,
  isUnderConstruction?: boolean,
): CardProps['styles'] => {
  const baseHeader: React.CSSProperties = {
    padding: 4,
    minHeight: 0,
    textAlign: 'center',
    fontSize: 'inherit',
    borderColor: 'transparent',
  };

  let header: React.CSSProperties = {};
  if (isUnderConstruction) {
    header = {
      ...baseHeader,
      backgroundColor: COLOR.GRAY_1,
    };
  } else if (isCurrentAgent) {
    header = {
      ...baseHeader,
      backgroundColor: COLOR.PURPLE_LIGHT_2,
      color: COLOR.PURPLE,
    };
  }

  const body: React.CSSProperties = {
    gap: 6,
    padding: isCurrentAgent ? '8px 16px 12px 16px' : '12px 16px',
    borderRadius: 'inherit',
    backgroundColor: isCurrentAgent ? COLOR.WHITE : undefined,
  };

  return { header, body };
};

type EachAgentProps = {
  showSelected: boolean;
  agentType: AgentType;
  agentConfig: AgentConfig;
};

const EachAgent = memo(
  ({ showSelected, agentType, agentConfig }: EachAgentProps) => {
    const { goto: gotoSetup } = useSetup();
    const { goto: gotoPage } = usePageState();
    const { updateOnboardingStep } = useSharedContext();
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

    const isUnderConstruction = agentConfig.isUnderConstruction;
    const isSafeCreated = masterSafes?.find(
      (masterSafe) =>
        masterSafe.evmChainId === AGENT_CONFIG[agentType].evmHomeChainId,
    );

    const handleSelectAgent = useCallback(async () => {
      updateAgentType(agentType);
      updateOnboardingStep(0); // Reset onboarding step

      // DO NOTE REMOVE THIS DELAY
      // NOTE: the delay is added so that agentType is updated in electron store
      // and re-rendered with the updated agentType
      await delayInSeconds(0.5);

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

      // If service is NOT created, then go to agent introduction
      gotoPage(Pages.Setup);
      gotoSetup(SetupScreen.AgentIntroduction);
    }, [
      updateOnboardingStep,
      isSafeCreated,
      services,
      gotoPage,
      gotoSetup,
      updateAgentType,
      agentType,
    ]);

    const tabText = useMemo(() => {
      return isUnderConstruction
        ? 'Agent is under construction. Select to learn more'
        : isCurrentAgent
          ? 'Current agent'
          : undefined;
    }, [isUnderConstruction, isCurrentAgent]);

    return (
      <Card
        key={agentType}
        style={getCardStyle(isCurrentAgent, !!isUnderConstruction)}
        styles={getCardStyles(isCurrentAgent, isUnderConstruction)}
        title={tabText}
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
              type={isUnderConstruction ? 'default' : 'primary'}
              onClick={handleSelectAgent}
              disabled={isServicesLoading || isMasterWalletLoading}
            >
              {isUnderConstruction && !isSafeCreated ? 'Learn more' : 'Select'}
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
  <CardFlex gap={10} styles={{ body: { padding: '12px 24px' } }} noBorder>
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
