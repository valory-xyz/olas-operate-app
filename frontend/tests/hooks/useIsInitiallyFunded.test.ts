import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { AgentMap } from '../../constants/agent';
import { useIsInitiallyFunded } from '../../hooks/useIsInitiallyFunded';
import { ElectronStore } from '../../types/ElectronApi';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  MOCK_SERVICE_CONFIG_ID_2,
  MOCK_SERVICE_CONFIG_ID_3,
} from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

const mockSetStore = jest.fn();
const mockElectronApi = jest.fn();
const mockUseServices = jest.fn();
const mockUseStore = jest.fn();

jest.mock('../../hooks/useElectronApi', () => ({
  useElectronApi: () => mockElectronApi(),
}));
jest.mock('../../hooks/useServices', () => ({
  useServices: () => mockUseServices(),
}));
jest.mock('../../hooks/useStore', () => ({
  useStore: () => mockUseStore(),
}));

describe('useIsInitiallyFunded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockElectronApi.mockReturnValue({
      store: { set: mockSetStore },
    });
    mockUseServices.mockReturnValue({
      selectedAgentType: AgentMap.PredictTrader,
      selectedServiceConfigId: DEFAULT_SERVICE_CONFIG_ID,
    });
  });

  describe('reading (per-service record)', () => {
    it('returns true when the selected service is funded', () => {
      const storeState: Partial<ElectronStore> = {
        [AgentMap.PredictTrader]: {
          isInitialFunded: { [DEFAULT_SERVICE_CONFIG_ID]: true },
        },
      };
      mockUseStore.mockReturnValue({ storeState });

      const { result } = renderHook(() => useIsInitiallyFunded());
      expect(result.current.isInitialFunded).toBe(true);
    });

    it('returns false when the selected service is not funded', () => {
      const storeState: Partial<ElectronStore> = {
        [AgentMap.PredictTrader]: {
          isInitialFunded: { [DEFAULT_SERVICE_CONFIG_ID]: false },
        },
      };
      mockUseStore.mockReturnValue({ storeState });

      const { result } = renderHook(() => useIsInitiallyFunded());
      expect(result.current.isInitialFunded).toBe(false);
    });

    it('returns undefined when the selected service is not in the record', () => {
      const storeState: Partial<ElectronStore> = {
        [AgentMap.PredictTrader]: {
          isInitialFunded: { MOCK_SERVICE_CONFIG_ID_2: true },
        },
      };
      mockUseStore.mockReturnValue({ storeState });

      const { result } = renderHook(() => useIsInitiallyFunded());
      expect(result.current.isInitialFunded).toBeUndefined();
    });

    it('returns undefined when selectedServiceConfigId is null', () => {
      mockUseServices.mockReturnValue({
        selectedAgentType: AgentMap.PredictTrader,
        selectedServiceConfigId: null,
      });
      const storeState: Partial<ElectronStore> = {
        [AgentMap.PredictTrader]: {
          isInitialFunded: { [DEFAULT_SERVICE_CONFIG_ID]: true },
        },
      };
      mockUseStore.mockReturnValue({ storeState });

      const { result } = renderHook(() => useIsInitiallyFunded());
      expect(result.current.isInitialFunded).toBeUndefined();
    });
  });

  describe('reading (legacy boolean — treated as unmigrated)', () => {
    it('returns undefined for legacy isInitialFunded=true (awaiting migration)', () => {
      const storeState: Partial<ElectronStore> = {
        [AgentMap.PredictTrader]: { isInitialFunded: true },
      };
      mockUseStore.mockReturnValue({ storeState });

      const { result } = renderHook(() => useIsInitiallyFunded());
      expect(result.current.isInitialFunded).toBeUndefined();
    });

    it('returns undefined for legacy isInitialFunded=false (awaiting migration)', () => {
      const storeState: Partial<ElectronStore> = {
        [AgentMap.PredictTrader]: { isInitialFunded: false },
      };
      mockUseStore.mockReturnValue({ storeState });

      const { result } = renderHook(() => useIsInitiallyFunded());
      expect(result.current.isInitialFunded).toBeUndefined();
    });
  });

  describe('reading (missing data)', () => {
    it('returns undefined when agent settings are missing from store', () => {
      mockUseStore.mockReturnValue({ storeState: {} });

      const { result } = renderHook(() => useIsInitiallyFunded());
      expect(result.current.isInitialFunded).toBeUndefined();
    });

    it('returns undefined when storeState is undefined', () => {
      mockUseStore.mockReturnValue({ storeState: undefined });

      const { result } = renderHook(() => useIsInitiallyFunded());
      expect(result.current.isInitialFunded).toBeUndefined();
    });
  });

  describe('reading correct agent type', () => {
    it('reads isInitialFunded for the correct agent type (AgentsFun)', () => {
      mockUseServices.mockReturnValue({
        selectedAgentType: AgentMap.AgentsFun,
        selectedServiceConfigId: MOCK_SERVICE_CONFIG_ID_2,
      });
      const storeState: Partial<ElectronStore> = {
        [AgentMap.AgentsFun]: {
          isInitialFunded: { [MOCK_SERVICE_CONFIG_ID_2]: true },
        },
        [AgentMap.PredictTrader]: {
          isInitialFunded: { [DEFAULT_SERVICE_CONFIG_ID]: false },
        },
      };
      mockUseStore.mockReturnValue({ storeState });

      const { result } = renderHook(() => useIsInitiallyFunded());
      expect(result.current.isInitialFunded).toBe(true);
    });
  });

  describe('writing (setIsInitiallyFunded)', () => {
    it('writes a per-service record when setIsInitiallyFunded is invoked', () => {
      mockUseStore.mockReturnValue({ storeState: {} });

      const { result } = renderHook(() => useIsInitiallyFunded());

      act(() => {
        result.current.setIsInitiallyFunded();
      });
      expect(mockSetStore).toHaveBeenCalledWith(
        `${AgentMap.PredictTrader}.isInitialFunded`,
        { [DEFAULT_SERVICE_CONFIG_ID]: true },
      );
    });

    it('preserves existing entries when writing', () => {
      const storeState: Partial<ElectronStore> = {
        [AgentMap.PredictTrader]: {
          isInitialFunded: { MOCK_SERVICE_CONFIG_ID_2: true },
        },
      };
      mockUseStore.mockReturnValue({ storeState });

      const { result } = renderHook(() => useIsInitiallyFunded());

      act(() => {
        result.current.setIsInitiallyFunded();
      });
      expect(mockSetStore).toHaveBeenCalledWith(
        `${AgentMap.PredictTrader}.isInitialFunded`,
        { MOCK_SERVICE_CONFIG_ID_2: true, [DEFAULT_SERVICE_CONFIG_ID]: true },
      );
    });

    it('uses the selected agent type in the store key for setIsInitiallyFunded', () => {
      mockUseServices.mockReturnValue({
        selectedAgentType: AgentMap.Modius,
        selectedServiceConfigId: MOCK_SERVICE_CONFIG_ID_3,
      });
      mockUseStore.mockReturnValue({ storeState: {} });

      const { result } = renderHook(() => useIsInitiallyFunded());

      act(() => {
        result.current.setIsInitiallyFunded();
      });
      expect(mockSetStore).toHaveBeenCalledWith(
        `${AgentMap.Modius}.isInitialFunded`,
        { [MOCK_SERVICE_CONFIG_ID_3]: true },
      );
    });

    it('is a no-op when selectedServiceConfigId is null', () => {
      mockUseServices.mockReturnValue({
        selectedAgentType: AgentMap.PredictTrader,
        selectedServiceConfigId: null,
      });
      mockUseStore.mockReturnValue({ storeState: {} });

      const { result } = renderHook(() => useIsInitiallyFunded());

      act(() => {
        result.current.setIsInitiallyFunded();
      });
      expect(mockSetStore).not.toHaveBeenCalled();
    });

    it('does not throw when store.set is undefined', () => {
      mockElectronApi.mockReturnValue({ store: {} });
      mockUseStore.mockReturnValue({ storeState: {} });

      const { result } = renderHook(() => useIsInitiallyFunded());

      expect(() => {
        act(() => {
          result.current.setIsInitiallyFunded();
        });
      }).not.toThrow();
    });

    it('does not throw when store is undefined', () => {
      mockElectronApi.mockReturnValue({});
      mockUseStore.mockReturnValue({ storeState: {} });

      const { result } = renderHook(() => useIsInitiallyFunded());

      expect(() => {
        act(() => {
          result.current.setIsInitiallyFunded();
        });
      }).not.toThrow();
    });
  });
});
