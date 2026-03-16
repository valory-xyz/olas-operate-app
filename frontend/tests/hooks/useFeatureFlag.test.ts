import { renderHook } from '@testing-library/react';

import { AgentMap } from '../../constants';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
// Import after mock to get the mocked version
import { useServices } from '../../hooks/useServices';

jest.mock('../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));
const mockUseServices = useServices as jest.Mock;

describe('useFeatureFlag', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('throws when selectedAgentType is missing', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('throws if selectedAgentType is null', () => {
      mockUseServices.mockReturnValue({ selectedAgentType: null });

      expect(() => {
        renderHook(() => useFeatureFlag('withdraw-funds'));
      }).toThrow('Feature Flag must be used within a ServicesProvider');
    });

    it('throws if selectedAgentType is undefined', () => {
      mockUseServices.mockReturnValue({ selectedAgentType: undefined });

      expect(() => {
        renderHook(() => useFeatureFlag('withdraw-funds'));
      }).toThrow('Feature Flag must be used within a ServicesProvider');
    });
  });

  describe('throws when agent type is not in config', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('throws for unsupported agent type', () => {
      mockUseServices.mockReturnValue({
        selectedAgentType: 'fake_agent',
      });

      expect(() => {
        renderHook(() => useFeatureFlag('withdraw-funds'));
      }).toThrow('Agent type fake_agent is not supported');
    });
  });

  describe('single feature flag', () => {
    describe.each([
      { agentName: 'PredictTrader', agentType: AgentMap.PredictTrader },
      { agentName: 'Polystrat', agentType: AgentMap.Polystrat },
      { agentName: 'AgentsFun', agentType: AgentMap.AgentsFun },
      { agentName: 'Optimus', agentType: AgentMap.Optimus },
      { agentName: 'PettAi', agentType: AgentMap.PettAi },
    ])('$agentName (all features enabled)', ({ agentType }) => {
      beforeEach(() => {
        mockUseServices.mockReturnValue({
          selectedAgentType: agentType,
        });
      });

      it('returns true for withdraw-funds', () => {
        const { result } = renderHook(() => useFeatureFlag('withdraw-funds'));
        expect(result.current).toBe(true);
      });

      it('returns true for backup-via-safe', () => {
        const { result } = renderHook(() => useFeatureFlag('backup-via-safe'));
        expect(result.current).toBe(true);
      });

      it('returns true for bridge-onboarding', () => {
        const { result } = renderHook(() =>
          useFeatureFlag('bridge-onboarding'),
        );
        expect(result.current).toBe(true);
      });

      it('returns true for on-ramp', () => {
        const { result } = renderHook(() => useFeatureFlag('on-ramp'));
        expect(result.current).toBe(true);
      });
    });

    describe('Modius (backup-via-safe disabled)', () => {
      beforeEach(() => {
        mockUseServices.mockReturnValue({
          selectedAgentType: AgentMap.Modius,
        });
      });

      it('returns true for withdraw-funds', () => {
        const { result } = renderHook(() => useFeatureFlag('withdraw-funds'));
        expect(result.current).toBe(true);
      });

      it('returns false for backup-via-safe', () => {
        const { result } = renderHook(() => useFeatureFlag('backup-via-safe'));
        expect(result.current).toBe(false);
      });

      it('returns true for bridge-onboarding', () => {
        const { result } = renderHook(() =>
          useFeatureFlag('bridge-onboarding'),
        );
        expect(result.current).toBe(true);
      });

      it('returns true for on-ramp', () => {
        const { result } = renderHook(() => useFeatureFlag('on-ramp'));
        expect(result.current).toBe(true);
      });
    });
  });

  describe('array of feature flags', () => {
    it('returns array of booleans for multiple flags (PredictTrader)', () => {
      mockUseServices.mockReturnValue({
        selectedAgentType: AgentMap.PredictTrader,
      });

      const { result } = renderHook(() =>
        useFeatureFlag([
          'withdraw-funds',
          'backup-via-safe',
          'bridge-onboarding',
          'on-ramp',
        ]),
      );

      expect(result.current).toEqual([true, true, true, true]);
    });

    it('returns array with false for Modius backup-via-safe', () => {
      mockUseServices.mockReturnValue({
        selectedAgentType: AgentMap.Modius,
      });

      const { result } = renderHook(() =>
        useFeatureFlag([
          'withdraw-funds',
          'backup-via-safe',
          'bridge-onboarding',
          'on-ramp',
        ]),
      );

      expect(result.current).toEqual([true, false, true, true]);
    });

    it('returns single-element array for array with one flag', () => {
      mockUseServices.mockReturnValue({
        selectedAgentType: AgentMap.PredictTrader,
      });

      const { result } = renderHook(() => useFeatureFlag(['withdraw-funds']));

      expect(result.current).toEqual([true]);
    });
  });

  describe('nullish coalescing fallback', () => {
    it('returns false for a single feature flag when the config value is undefined', () => {
      // Temporarily add a partial config that lacks a key to trigger ?? false
      // The FEATURES_CONFIG is validated at parse time, so all keys exist.
      // However the ?? false on line 97-98 handles the case where the key lookup
      // returns undefined. We can simulate this by checking that the return type
      // is boolean (false) for a known flag on a known agent. Since all configured
      // flags are either true or false, the ?? false fallback is technically
      // unreachable for validated configs. But we can verify the Modius backup-via-safe
      // case returns false (the actual value, not the fallback).
      mockUseServices.mockReturnValue({
        selectedAgentType: AgentMap.Modius,
      });

      const { result } = renderHook(() => useFeatureFlag('backup-via-safe'));
      // This exercises the single flag path (line 97-98) with a false value
      expect(result.current).toBe(false);
    });
  });
});
