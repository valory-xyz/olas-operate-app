import { Button, Flex, Segmented, Spin, Typography } from 'antd';
import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { AgentIntroduction } from '@/components/AgentIntroduction';
import { BackButton } from '@/components/ui/BackButton';
import { AGENT_CONFIG } from '@/config/agents';
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

const { Text, Title } = Typography;

type AgentTab = (typeof AGENT_TAB)[keyof typeof AGENT_TAB];

const AgentOnboardingContainer = styled(Flex)`
  width: 840px;
  margin: 16px auto 0 auto;
  border-radius: 8px;
`;

const Container = styled(Flex)`
  width: 840px;
  border-radius: 16px;
  background-color: ${COLOR.WHITE};
  .agent-selection-left-content {
    width: 380px;
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
      <Text type="secondary">Review and select the AI agent you like.</Text>
    </Flex>
  );
};

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
  const { updateAgentType, services } = useServices();
  const { archivedAgents, unarchiveAgent } = useArchivedAgents();

  const [selectedAgent, setSelectedAgent] = useState<Optional<AgentType>>();
  const [activeTab, setActiveTab] = useState<AgentTab>(AGENT_TAB.New);

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
  }, [goto, selectedAgent]);

  const handleSelectYourAgent = useCallback(
    (agentType: AgentType) => {
      updateAgentType(agentType);
      setSelectedAgent(agentType);
    },
    [updateAgentType],
  );

  const handleSelectArchivedAgent = useCallback((agentType: AgentType) => {
    setSelectedAgent(agentType);
  }, []);

  const handleRestoreAgent = useCallback(() => {
    if (!selectedAgent) return;
    unarchiveAgent(selectedAgent);
    updateAgentType(selectedAgent);
    gotoPage(PAGES.Main);
  }, [gotoPage, selectedAgent, unarchiveAgent, updateAgentType]);

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
          agentType={selectedAgent}
          renderAgentSelection={
            selectedAgent
              ? () => (
                  <Button
                    onClick={handleRestoreAgent}
                    type="primary"
                    block
                    size="large"
                  >
                    Restore Agent
                  </Button>
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
                <Button
                  onClick={handleAgentSelect}
                  type="primary"
                  block
                  size="large"
                >
                  Select Agent
                </Button>
              )
            : undefined
        }
      />
    );
  }, [
    activeTab,
    canSelectAgent,
    handleAgentSelect,
    handleRestoreAgent,
    isAgentGeoRestricted,
    isGeoError,
    isGeoLoading,
    selectedAgent,
    selectedAgentConfig?.isGeoLocationRestricted,
  ]);

  return (
    <>
      <AgentOnboardingContainer vertical gap={24}>
        <SelectYourAgent canGoBack={isNonEmpty(services)} />

        <Flex>
          {archivedAgents.length > 0 && (
            <Flex
              className="px-24 py-12"
              style={{ borderBottom: `1px solid ${COLOR.GRAY_4}` }}
            >
              <Segmented
                block
                options={[
                  { label: '+ New agents', value: AGENT_TAB.New },
                  { label: 'Archived agents', value: AGENT_TAB.Archived },
                ]}
                value={activeTab}
                onChange={(val) => {
                  setActiveTab(val as AgentTab);
                  setSelectedAgent(undefined);
                }}
              />
            </Flex>
          )}
        </Flex>

        <Container vertical>
          <Flex vertical className="agent-selection-left-content">
            <SelectAgent
              onSelectYourAgent={handleSelectYourAgent}
              onSelectArchivedAgent={handleSelectArchivedAgent}
              selectedAgent={selectedAgent}
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
