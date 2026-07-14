import { Button, Flex, message, Spin, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuArchive } from 'react-icons/lu';
import { TbPlus } from 'react-icons/tb';
import styled from 'styled-components';

import { AgentIntroduction } from '@/components/AgentIntroduction';
import { Segmented } from '@/components/ui';
import { BackButton } from '@/components/ui/BackButton';
import { AGENT_CONFIG } from '@/config/agents';
import {
  AgentMap,
  AgentType,
  COLOR,
  EvmChainId,
  PAGES,
  SETUP_SCREEN,
} from '@/constants';
import {
  useArchivedAgents,
  useCreateConnectService,
  useIsAgentGeoRestricted,
  usePageState,
  useServices,
  useSetup,
} from '@/hooks';
import { Optional } from '@/types';
import { asEvmChainId, isNonEmpty, matchesAgentConfig } from '@/utils';

import { FundingRequirementStep } from './FundingRequirementStep';
import { RestrictedRegion } from './RestrictedRegion';
import { AGENT_TAB, SelectAgent } from './SelectAgent';
import { findUndeployedInstance } from './utils';

const { Text, Title } = Typography;

type AgentTab = (typeof AGENT_TAB)[keyof typeof AGENT_TAB];

const OPTIONS = [
  {
    label: 'New agents',
    value: AGENT_TAB.New,
    icon: <TbPlus />,
  },
  {
    label: 'Archived agents',
    value: AGENT_TAB.Archived,
    icon: <LuArchive />,
  },
];

const AgentOnboardingContainer = styled(Flex)`
  margin: 0 auto;
`;

const Container = styled(Flex)`
  width: 840px;
  height: 716px;
  border-radius: 16px;
  background-color: ${COLOR.WHITE};
  overflow: hidden;
  .agent-selection-left-content {
    width: 380px;
    height: 100%;
    border-right: 1px solid ${COLOR.GRAY_4};
  }
  .agent-selection-left-header {
    padding: 24px 24px 16px 24px;
  }
  .agent-selection-left-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
  .agent-selection-right-content {
    width: 460px;
    height: 100%;
    overflow: hidden;
  }
  .agent-selection-right-content > * {
    flex: 1;
    min-height: 0;
  }
`;

type BlockButtonProps = {
  text: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
};
const BlockButton = ({
  text,
  onClick,
  disabled,
  loading,
}: BlockButtonProps) => (
  <Button
    onClick={onClick}
    type="primary"
    block
    size="large"
    disabled={disabled}
    loading={loading}
  >
    {text}
  </Button>
);

const GeoLocationRestrictionLoading = () => (
  <Flex
    align="center"
    justify="center"
    style={{ width: '100%', height: '100%' }}
  >
    <Spin />
  </Flex>
);

const GeoLocationRestrictionCouldNotLoad = () => (
  <Flex
    vertical
    align="center"
    justify="center"
    gap={16}
    className="p-24 text-center"
  >
    <Title level={4} className="m-0">
      Something went wrong
    </Title>
    <Text className="text-neutral-tertiary">
      Something went wrong while checking your region eligibility. Please try
      again.
    </Text>
  </Flex>
);

/**
 * Display the onboarding of the selected agent.
 */
export const AgentOnboarding = () => {
  const { goto } = useSetup();
  const { goto: gotoPage } = usePageState();
  const {
    services,
    selectAgentTypeForSetup,
    updateSelectedServiceConfigId,
    getAgentTypeFromService,
  } = useServices();
  const { archivedInstances, unarchiveInstance } = useArchivedAgents();

  const [selectedAgent, setSelectedAgent] = useState<Optional<AgentType>>();
  const [selectedArchivedInstanceId, setSelectedArchivedInstanceId] =
    useState<Optional<string>>();
  const [activeTab, setActiveTab] = useState<AgentTab>(AGENT_TAB.New);
  // Connect only: the operating chain picked in the funding-requirements step.
  const [selectedConnectChain, setSelectedConnectChain] =
    useState<Optional<EvmChainId>>();
  const [isCreatingConnect, setIsCreatingConnect] = useState(false);
  // Incremented to send the user back to the chain selector (first slide) and
  // highlight it when "Select agent" is clicked without a chain chosen.
  const [chainPromptSignal, setChainPromptSignal] = useState(0);
  const createConnectService = useCreateConnectService();

  // Reset the chosen Connect chain whenever the selected agent changes.
  useEffect(() => setSelectedConnectChain(undefined), [selectedAgent]);

  const handleConnectCreate = useCallback(async () => {
    if (!selectedConnectChain) {
      // No chain chosen — jump to the first slide (chain selector) and
      // highlight it, instead of creating.
      setChainPromptSignal((signal) => signal + 1);
      return;
    }
    setIsCreatingConnect(true);
    try {
      // Creates the Connect service (no_staking) and routes to funding.
      await createConnectService(selectedConnectChain);
    } catch (error) {
      console.error(error);
      message.error('Failed to create the Connect agent. Please try again.');
      setIsCreatingConnect(false);
    }
  }, [selectedConnectChain, createConnectService]);

  // Derive agentType for the selected archived instance (for AgentIntroduction)
  const selectedArchivedAgentType = useMemo<Optional<AgentType>>(() => {
    if (!selectedArchivedInstanceId) return undefined;
    return getAgentTypeFromService(selectedArchivedInstanceId) ?? undefined;
  }, [selectedArchivedInstanceId, getAgentTypeFromService]);

  const selectedAgentConfig = selectedAgent
    ? AGENT_CONFIG[selectedAgent]
    : undefined;

  const { isAgentGeoRestricted, isGeoLoading, isGeoError } =
    useIsAgentGeoRestricted({
      agentType: selectedAgent,
      agentConfig: selectedAgentConfig,
    });

  const handleAgentSelect = useCallback(() => {
    if (!selectedAgent) return;
    const currentAgentConfig = AGENT_CONFIG[selectedAgent];

    // If an undeployed instance exists, select it, instead of
    // letting the user create another new instance
    if (services) {
      const undeployed = findUndeployedInstance(selectedAgent, services);
      const isArchived = undeployed
        ? archivedInstances.includes(undeployed.service_config_id)
        : false;

      if (undeployed && !isArchived) {
        updateSelectedServiceConfigId(undeployed.service_config_id);
        gotoPage(PAGES.Main);
        return;
      }
    }

    // if agent is "coming soon" should be redirected to EARLY ACCESS PAGE
    if (currentAgentConfig.isComingSoon) {
      goto(SETUP_SCREEN.EarlyAccessOnly);
      return;
    }

    // if the selected type requires setting up an agent,
    // should be redirected to setup screen.
    if (currentAgentConfig.requiresSetup && !currentAgentConfig.isX402Enabled) {
      goto(SETUP_SCREEN.SetupYourAgent);
    } else {
      goto(SETUP_SCREEN.SelectStaking);
    }
  }, [
    archivedInstances,
    goto,
    gotoPage,
    selectedAgent,
    services,
    updateSelectedServiceConfigId,
  ]);

  const handleSelectYourAgent = useCallback(
    (agentType: AgentType) => {
      selectAgentTypeForSetup(agentType);
      setSelectedAgent(agentType);
    },
    [selectAgentTypeForSetup],
  );

  const handleSelectArchivedInstance = useCallback(
    (serviceConfigId: string) => {
      setSelectedArchivedInstanceId(serviceConfigId);
    },
    [],
  );

  const handleRestoreInstance = useCallback(() => {
    if (!selectedArchivedInstanceId) return;
    unarchiveInstance(selectedArchivedInstanceId);
    updateSelectedServiceConfigId(selectedArchivedInstanceId);
    setTimeout(() => gotoPage(PAGES.Main), 300);
  }, [
    gotoPage,
    selectedArchivedInstanceId,
    unarchiveInstance,
    updateSelectedServiceConfigId,
  ]);

  const canSelectAgent = useMemo(() => {
    if (!selectedAgent) return false;
    const currentAgentConfig = AGENT_CONFIG[selectedAgent];
    if (currentAgentConfig.isGeoLocationRestricted && isAgentGeoRestricted) {
      return false;
    }
    if (currentAgentConfig.isUnderConstruction) {
      return false;
    }
    if (currentAgentConfig.isAddingNewBlocked) {
      return false;
    }
    return true;
  }, [selectedAgent, isAgentGeoRestricted]);

  const connectConfig = AGENT_CONFIG[AgentMap.Connect];
  // Every supported chain already has a Connect instance (one per chain) →
  // there is nothing left to add, so the "Select Agent" button is hidden.
  const connectAllChainsOccupied = useMemo(() => {
    const supported = connectConfig.supportedChains ?? [];
    if (supported.length === 0) return false;
    const occupied = new Set<EvmChainId>();
    (services ?? []).forEach((service) => {
      if (matchesAgentConfig(service, connectConfig)) {
        occupied.add(asEvmChainId(service.home_chain));
      }
    });
    return supported.every((chainId) => occupied.has(chainId));
  }, [services, connectConfig]);

  const rightPanelContent = useMemo(() => {
    if (activeTab === AGENT_TAB.Archived) {
      return (
        <AgentIntroduction
          agentType={selectedArchivedAgentType}
          fillHeight
          renderAgentSelection={
            selectedArchivedInstanceId
              ? () => (
                  <BlockButton
                    text="Restore Agent"
                    onClick={handleRestoreInstance}
                  />
                )
              : undefined
          }
        />
      );
    }

    if (isGeoLoading && selectedAgentConfig?.isGeoLocationRestricted) {
      return <GeoLocationRestrictionLoading />;
    }
    if (isGeoError) {
      return <GeoLocationRestrictionCouldNotLoad />;
    }
    if (isAgentGeoRestricted) {
      return <RestrictedRegion />;
    }

    const isConnect = selectedAgent === AgentMap.Connect;

    return (
      <AgentIntroduction
        agentType={selectedAgent}
        fillHeight
        goToFirstStepSignal={isConnect ? chainPromptSignal : undefined}
        renderFundingRequirements={(desc) =>
          selectedAgent ? (
            <FundingRequirementStep
              agentType={selectedAgent}
              desc={desc}
              selectedChain={isConnect ? selectedConnectChain : undefined}
              onSelectChain={isConnect ? setSelectedConnectChain : undefined}
              highlightSignal={isConnect ? chainPromptSignal : undefined}
            />
          ) : null
        }
        renderAgentSelection={
          isConnect
            ? // No button once every chain has a Connect instance; otherwise
              // it creates the service (no_staking) with the chosen chain, or
              // jumps back to the chain selector when none is chosen.
              connectAllChainsOccupied
              ? undefined
              : () => (
                  <BlockButton
                    text="Select Agent"
                    onClick={handleConnectCreate}
                    disabled={isCreatingConnect}
                    loading={isCreatingConnect}
                  />
                )
            : canSelectAgent
              ? () => (
                  <BlockButton
                    text="Select Agent"
                    onClick={handleAgentSelect}
                  />
                )
              : undefined
        }
      />
    );
  }, [
    activeTab,
    canSelectAgent,
    connectAllChainsOccupied,
    handleAgentSelect,
    handleRestoreInstance,
    isAgentGeoRestricted,
    isGeoError,
    isGeoLoading,
    selectedAgent,
    selectedAgentConfig?.isGeoLocationRestricted,
    selectedArchivedAgentType,
    selectedArchivedInstanceId,
    selectedConnectChain,
    isCreatingConnect,
    handleConnectCreate,
    chainPromptSignal,
  ]);

  return (
    <>
      <AgentOnboardingContainer vertical gap={24}>
        {isNonEmpty(services) && (
          <BackButton onPrev={() => gotoPage(PAGES.Main)} />
        )}

        {archivedInstances.length > 0 && (
          <Flex style={{ borderBottom: `1px solid ${COLOR.GRAY_4}` }}>
            <Segmented
              options={OPTIONS}
              value={activeTab}
              onChange={(val) => {
                setActiveTab(val as AgentTab);
                setSelectedAgent(undefined);
                setSelectedArchivedInstanceId(undefined);
              }}
              size="large"
            />
          </Flex>
        )}

        <Container>
          <Flex vertical className="agent-selection-left-content">
            <Flex vertical gap={8} className="agent-selection-left-header">
              <Title level={3} className="m-0">
                Select your agent
              </Title>
              <Text type="secondary">
                Review and select the AI agent you like.
              </Text>
            </Flex>
            <div className="agent-selection-left-list">
              <SelectAgent
                onSelectYourAgent={handleSelectYourAgent}
                onSelectArchivedInstance={handleSelectArchivedInstance}
                selectedAgent={selectedAgent}
                selectedArchivedInstance={selectedArchivedInstanceId}
                activeTab={activeTab}
              />
            </div>
          </Flex>

          <Flex vertical className="agent-selection-right-content">
            {rightPanelContent}
          </Flex>
        </Container>
      </AgentOnboardingContainer>
    </>
  );
};
