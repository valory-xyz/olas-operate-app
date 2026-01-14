import { Button, Flex, Spin, Typography } from 'antd';
import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { AgentIntroduction } from '@/components/AgentIntroduction';
import { AGENT_CONFIG } from '@/config/agents';
import { AgentType, COLOR, SETUP_SCREEN } from '@/constants';
import { useGeoEligibility, useServices, useSetup } from '@/hooks';
import { Optional } from '@/types';

import { FundingRequirementStep } from './FundingRequirementStep';
import { RestrictedRegion } from './RestrictedRegion';
import { SelectAgent } from './SelectAgent';

const { Text, Title } = Typography;

const Container = styled(Flex)`
  width: 840px;
  margin: 16px auto 0 auto;
  border-radius: 8px;
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

const GeoLocationRestrictionLoading = () => (
  <Flex
    style={{
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    }}
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
      Something went wrong to check your region eligibility. Please try again.
    </Text>
  </Flex>
);

/**
 * Display the onboarding of the selected agent.
 */
export const AgentOnboarding = () => {
  const { goto } = useSetup();
  const { updateAgentType } = useServices();
  const [selectedAgent, setSelectedAgent] = useState<Optional<AgentType>>();
  const [geoCheckTriggered, setGeoCheckTriggered] = useState(false);

  const selectedAgentConfig = selectedAgent
    ? AGENT_CONFIG[selectedAgent]
    : undefined;

  // fetch GEO eligibility only if the agent is geo-restricted and the user has selected it
  const {
    data: geoData,
    isLoading: isGeoLoading,
    isError: isGeoError,
  } = useGeoEligibility({
    agentType: selectedAgent,
    enabled:
      geoCheckTriggered &&
      !!selectedAgent &&
      selectedAgentConfig?.isGeoLocationRestricted,
  });

  // Determine if the agent is restricted
  const isAgentRestricted = useMemo(() => {
    if (!selectedAgentConfig?.isGeoLocationRestricted) return false;
    if (!geoData) return null; // loading state
    if (isGeoError) return null; // error state

    const agentEligibility = geoData.eligibility[selectedAgent || ''];
    if (!agentEligibility) return null;

    return agentEligibility.status !== 'allowed';
  }, [selectedAgent, geoData, isGeoError, selectedAgentConfig]);

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
      if (AGENT_CONFIG[agentType].isGeoLocationRestricted) {
        setGeoCheckTriggered(true);
      }
    },
    [updateAgentType],
  );

  const canSelectAgent = selectedAgent
    ? !AGENT_CONFIG[selectedAgent].isUnderConstruction && !isAgentRestricted
    : false;

  return (
    <Container>
      <Flex vertical className="agent-selection-left-content">
        <SelectAgent
          onSelectYourAgent={handleSelectYourAgent}
          selectedAgent={selectedAgent}
        />
      </Flex>

      <Flex className="agent-selection-right-content">
        {isGeoLoading && selectedAgentConfig?.isGeoLocationRestricted ? (
          <GeoLocationRestrictionLoading />
        ) : isGeoError ? (
          <GeoLocationRestrictionCouldNotLoad />
        ) : isAgentRestricted ? (
          <RestrictedRegion />
        ) : (
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
        )}
      </Flex>
    </Container>
  );
};
