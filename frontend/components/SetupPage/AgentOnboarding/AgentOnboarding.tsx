import { Button, Flex, Spin, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuArchive } from 'react-icons/lu';
import { TbPlus } from 'react-icons/tb';
import styled from 'styled-components';

import { AgentIntroduction } from '@/components/AgentIntroduction';
import { Segmented } from '@/components/ui';
import { BackButton } from '@/components/ui/BackButton';
import { ACTIVE_AGENTS, AGENT_CONFIG } from '@/config/agents';
import { AgentType, COLOR, PAGES, SETUP_SCREEN } from '@/constants';
import {
  useArchivedAgents,
  useIsAgentGeoRestricted,
  usePageState,
  useServices,
  useSetup,
} from '@/hooks';
import { Optional } from '@/types';
import { isNonEmpty } from '@/utils';

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
  border-radius: 16px;
  background-color: ${COLOR.WHITE};
  .agent-selection-left-content {
    width: 380px;
    padding: 16px 0;
    border-right: 1px solid ${COLOR.GRAY_4};
  }
  .agent-selection-right-content {
    width: 460px;
    min-height: 600px;
    overflow: hidden;
  }
`;

const SelectYourAgent = ({ canGoBack }: { canGoBack: boolean }) => {
  const { goto } = usePageState();
  return (
    <Flex vertical gap={12}>
      {canGoBack && <BackButton onPrev={() => goto(PAGES.Main)} />}
      <Title level={3} className="m-0">
        Select Agent
      </Title>
      <Text type="secondary">
        Review and select the AI agent you&apos;d like to add or restore.
      </Text>
    </Flex>
  );
};

type BlockButtonProps = { text: string; onClick: () => void };
const BlockButton = ({ text, onClick }: BlockButtonProps) => (
  <Button onClick={onClick} type="primary" block size="large">
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

  // Derive agentType for the selected archived instance (for AgentIntroduction)
  const selectedArchivedAgentType = useMemo<Optional<AgentType>>(() => {
    if (!selectedArchivedInstanceId) return undefined;
    return getAgentTypeFromService(selectedArchivedInstanceId) ?? undefined;
  }, [selectedArchivedInstanceId, getAgentTypeFromService]);

  // Default to "Archived" tab if there are no new agents to add
  const hasSetDefaultTab = useRef(false);
  useEffect(() => {
    if (hasSetDefaultTab.current) return;
    if (!services) return;
    hasSetDefaultTab.current = true;

    const hasNewAgents = ACTIVE_AGENTS.some(
      ([, agentConfig]) =>
        !services.some(
          ({ service_public_id, home_chain }) =>
            service_public_id === agentConfig.servicePublicId &&
            home_chain === agentConfig.middlewareHomeChainId,
        ),
    );

    if (!hasNewAgents && archivedInstances.length > 0) {
      setActiveTab(AGENT_TAB.Archived);
    }
  }, [archivedInstances, services]);

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
  }, [goto, gotoPage, selectedAgent, services, updateSelectedServiceConfigId]);

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
    return true;
  }, [selectedAgent, isAgentGeoRestricted]);

  const rightPanelContent = useMemo(() => {
    if (activeTab === AGENT_TAB.Archived) {
      return (
        <AgentIntroduction
          agentType={selectedArchivedAgentType}
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

    return (
      <AgentIntroduction
        agentType={selectedAgent}
        renderFundingRequirements={(desc) =>
          selectedAgent ? (
            <FundingRequirementStep agentType={selectedAgent} desc={desc} />
          ) : null
        }
        renderAgentSelection={
          canSelectAgent
            ? () => (
                <BlockButton text="Select Agent" onClick={handleAgentSelect} />
              )
            : undefined
        }
      />
    );
  }, [
    activeTab,
    canSelectAgent,
    handleAgentSelect,
    handleRestoreInstance,
    isAgentGeoRestricted,
    isGeoError,
    isGeoLoading,
    selectedAgent,
    selectedAgentConfig?.isGeoLocationRestricted,
    selectedArchivedAgentType,
    selectedArchivedInstanceId,
  ]);

  return (
    <>
      <AgentOnboardingContainer vertical gap={24}>
        <SelectYourAgent canGoBack={isNonEmpty(services)} />

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
            <SelectAgent
              onSelectYourAgent={handleSelectYourAgent}
              onSelectArchivedInstance={handleSelectArchivedInstance}
              selectedAgent={selectedAgent}
              selectedArchivedInstance={selectedArchivedInstanceId}
              activeTab={activeTab}
            />
          </Flex>

          <Flex className="agent-selection-right-content">
            {rightPanelContent}
          </Flex>
        </Container>
      </AgentOnboardingContainer>
    </>
  );
};
