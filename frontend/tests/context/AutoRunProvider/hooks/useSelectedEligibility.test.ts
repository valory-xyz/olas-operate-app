import { renderHook } from '@testing-library/react';

import { AGENT_CONFIG } from '../../../../config/agents';
import { AgentMap } from '../../../../constants/agent';
import { EvmChainId } from '../../../../constants/chains';
import { useSelectedEligibility } from '../../../../context/AutoRunProvider/hooks/useSelectedEligibility';
import { useServices } from '../../../../hooks';
import { useDeployability } from '../../../../hooks/useDeployability';

jest.mock('../../../../hooks', () => ({
  useServices: jest.fn(),
}));
jest.mock('../../../../hooks/useDeployability', () => ({
  useDeployability: jest.fn(),
}));

const mockUseServices = useServices as jest.MockedFunction<typeof useServices>;
const mockUseDeployability = useDeployability as jest.MockedFunction<
  typeof useDeployability
>;

const traderConfig = AGENT_CONFIG[AgentMap.PredictTrader];

describe('useSelectedEligibility', () => {
  const canCreateSafeForChain = jest.fn((_chainId: EvmChainId) => ({
    ok: true,
    isLoading: false,
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServices.mockReturnValue({
      selectedAgentConfig: traderConfig,
      selectedAgentType: AgentMap.PredictTrader,
    } as unknown as ReturnType<typeof useServices>);
    mockUseDeployability.mockReturnValue({
      canRun: true,
      reason: undefined,
      loadingReason: undefined,
      isLoading: false,
    } as ReturnType<typeof useDeployability>);
  });

  it('returns selectedAgentType from useServices', () => {
    const { result } = renderHook(() =>
      useSelectedEligibility({ canCreateSafeForChain }),
    );
    expect(result.current.selectedAgentType).toBe(AgentMap.PredictTrader);
  });

  it('returns selectedAgentConfig from useServices', () => {
    const { result } = renderHook(() =>
      useSelectedEligibility({ canCreateSafeForChain }),
    );
    expect(result.current.selectedAgentConfig).toBe(traderConfig);
  });

  it('returns isSelectedAgentDetailsLoading from deployability', () => {
    mockUseDeployability.mockReturnValue({
      canRun: false,
      isLoading: true,
      reason: 'Loading',
      loadingReason: 'Balances',
    } as ReturnType<typeof useDeployability>);
    const { result } = renderHook(() =>
      useSelectedEligibility({ canCreateSafeForChain }),
    );
    expect(result.current.isSelectedAgentDetailsLoading).toBe(true);
  });

  it('getSelectedEligibility returns latest deployability state', () => {
    mockUseDeployability.mockReturnValue({
      canRun: false,
      reason: 'Low balance',
      loadingReason: undefined,
      isLoading: false,
    } as ReturnType<typeof useDeployability>);
    const { result } = renderHook(() =>
      useSelectedEligibility({ canCreateSafeForChain }),
    );
    const eligibility = result.current.getSelectedEligibility();
    expect(eligibility).toEqual({
      canRun: false,
      reason: 'Low balance',
      loadingReason: undefined,
    });
  });

  it('getSelectedEligibility reflects updated deployability after rerender', () => {
    mockUseDeployability.mockReturnValue({
      canRun: false,
      reason: 'Loading',
      loadingReason: 'Balances',
      isLoading: true,
    } as ReturnType<typeof useDeployability>);
    const { result, rerender } = renderHook(() =>
      useSelectedEligibility({ canCreateSafeForChain }),
    );
    expect(result.current.getSelectedEligibility().canRun).toBe(false);

    mockUseDeployability.mockReturnValue({
      canRun: true,
      reason: undefined,
      loadingReason: undefined,
      isLoading: false,
    } as ReturnType<typeof useDeployability>);
    rerender();
    expect(result.current.getSelectedEligibility().canRun).toBe(true);
  });

  it('passes safe eligibility for the selected chain to useDeployability', () => {
    renderHook(() => useSelectedEligibility({ canCreateSafeForChain }));
    expect(canCreateSafeForChain).toHaveBeenCalledWith(
      traderConfig.evmHomeChainId,
    );
  });
});
