import { renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import { AGENT_CONFIG } from '../../config/agents';
import { AgentMap } from '../../constants';
import { ServicesContext } from '../../context/ServicesProvider';
import { useServices } from '../../hooks/useServices';

describe('useServices', () => {
  it('returns the value provided by ServicesContext', () => {
    const mockUpdateAgentType = jest.fn();
    const contextValue = {
      isFetched: true,
      paused: false,
      setPaused: jest.fn(),
      togglePaused: jest.fn(),
      isSelectedServiceDeploymentStatusLoading: false,
      selectedAgentConfig: AGENT_CONFIG[AgentMap.PredictTrader],
      selectedAgentType: AgentMap.PredictTrader,
      selectedAgentName: 'Agent-1',
      selectedAgentNameOrFallback: 'Agent-1',
      deploymentDetails: undefined,
      updateAgentType: mockUpdateAgentType,
      selectAgentTypeForSetup: jest.fn(),
      updateSelectedServiceConfigId: jest.fn(),
      overrideSelectedServiceStatus: jest.fn(),
      availableServiceConfigIds: [],
      selectedServiceConfigId: null,
      getServiceConfigIdsOf: jest.fn().mockReturnValue([]),
      getAgentTypeFromService: jest.fn().mockReturnValue(null),
      getServiceConfigIdFromAgentType: jest.fn().mockReturnValue(null),
      getInstancesOfAgentType: jest.fn().mockReturnValue([]),
    };

    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(
        ServicesContext.Provider,
        { value: contextValue },
        children,
      );

    const { result } = renderHook(() => useServices(), { wrapper });

    expect(result.current.isFetched).toBe(true);
    expect(result.current.selectedAgentType).toBe(AgentMap.PredictTrader);
    expect(result.current.selectedAgentName).toBe('Agent-1');
    expect(result.current.updateAgentType).toBe(mockUpdateAgentType);
  });

  it('returns the default context value when no provider wraps it', () => {
    const { result } = renderHook(() => useServices());

    expect(result.current.isFetched).toBe(false);
    expect(result.current.selectedAgentType).toBe(AgentMap.PredictTrader);
    expect(result.current.availableServiceConfigIds).toEqual([]);
  });
});
