import { Button, Flex, Spin, Typography } from 'antd';
import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { AgentIntroduction } from '@/components/AgentIntroduction';
import { AGENT_CONFIG } from '@/config/agents';
import { AgentType, COLOR, PAGES, SETUP_SCREEN } from '@/constants';
import {
  useIsAgentGeoRestricted,
  usePageState,
  useServices,
  useSetup,
} from '@/hooks';
import { Optional } from '@/types';
import { findUndeployedInstance } from '@/utils';

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
  const { services, selectAgentTypeForSetup, updateSelectedServiceConfigId } =
    useServices();
  const [selectedAgent, setSelectedAgent] = useState<Optional<AgentType>>();

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
      if (undeployed) {
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
        ) : isAgentGeoRestricted ? (
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
