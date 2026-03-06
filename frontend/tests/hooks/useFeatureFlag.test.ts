import { renderHook } from '@testing-library/react';

import { AgentMap } from '../../constants/agent';

jest.mock('../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));

import { useServices } from '../../hooks/useServices';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';

const mockUseServices = useServices as jest.Mock;

describe('useFeatureFlag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when selectedAgentType is undefined', () => {
    mockUseServices.mockReturnValue({ selectedAgentType: undefined });
    expect(() => renderHook(() => useFeatureFlag('withdraw-funds'))).toThrow(
      'Feature Flag must be used within a ServicesProvider',
    );
  });

  it('returns true for withdraw-funds on PredictTrader', () => {
    mockUseServices.mockReturnValue({
      selectedAgentType: AgentMap.PredictTrader,
    });
    const { result } = renderHook(() => useFeatureFlag('withdraw-funds'));
    expect(result.current).toBe(true);
  });

  it('returns true for staking-contract-section on PredictTrader', () => {
    mockUseServices.mockReturnValue({
      selectedAgentType: AgentMap.PredictTrader,
    });
    const { result } = renderHook(() =>
      useFeatureFlag('staking-contract-section'),
    );
    expect(result.current).toBe(true);
  });

  it('returns false for bridge-add-funds on AgentsFun', () => {
    mockUseServices.mockReturnValue({
      selectedAgentType: AgentMap.AgentsFun,
    });
    const { result } = renderHook(() => useFeatureFlag('bridge-add-funds'));
    expect(result.current).toBe(false);
  });

  it('returns false for backup-via-safe on Modius', () => {
    mockUseServices.mockReturnValue({
      selectedAgentType: AgentMap.Modius,
    });
    const { result } = renderHook(() => useFeatureFlag('backup-via-safe'));
    expect(result.current).toBe(false);
  });

  it('returns false for staking-contract-section on PettAi', () => {
    mockUseServices.mockReturnValue({
      selectedAgentType: AgentMap.PettAi,
    });
    const { result } = renderHook(() =>
      useFeatureFlag('staking-contract-section'),
    );
    expect(result.current).toBe(false);
  });

  it('returns false for bridge-add-funds on PettAi', () => {
    mockUseServices.mockReturnValue({
      selectedAgentType: AgentMap.PettAi,
    });
    const { result } = renderHook(() => useFeatureFlag('bridge-add-funds'));
    expect(result.current).toBe(false);
  });

  it('returns an array of booleans when given an array of flags', () => {
    mockUseServices.mockReturnValue({
      selectedAgentType: AgentMap.AgentsFun,
    });
    const { result } = renderHook(() =>
      useFeatureFlag(['withdraw-funds', 'bridge-add-funds', 'on-ramp']),
    );
    expect(result.current).toEqual([true, false, true]);
  });

  it('returns all-true array for PredictTrader (all flags enabled)', () => {
    mockUseServices.mockReturnValue({
      selectedAgentType: AgentMap.PredictTrader,
    });
    const { result } = renderHook(() =>
      useFeatureFlag([
        'withdraw-funds',
        'staking-contract-section',
        'backup-via-safe',
        'bridge-onboarding',
        'bridge-add-funds',
        'on-ramp',
      ]),
    );
    expect(result.current).toEqual([true, true, true, true, true, true]);
  });
});
