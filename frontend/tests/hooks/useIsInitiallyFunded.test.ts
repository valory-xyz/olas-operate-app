import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { AgentMap } from '../../constants/agent';
import { useIsInitiallyFunded } from '../../hooks/useIsInitiallyFunded';
import { ElectronStore } from '../../types/ElectronApi';

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
    });
  });

  it('returns isInitialFunded=true when store has isInitialFunded set for selected agent', () => {
    const storeState: Partial<ElectronStore> = {
      [AgentMap.PredictTrader]: {
        isInitialFunded: true,
        isProfileWarningDisplayed: false,
      },
    };
    mockUseStore.mockReturnValue({ storeState });

    const { result } = renderHook(() => useIsInitiallyFunded());
    expect(result.current.isInitialFunded).toBe(true);
  });

  it('returns isInitialFunded=false when store has isInitialFunded=false for selected agent', () => {
    const storeState: Partial<ElectronStore> = {
      [AgentMap.PredictTrader]: {
        isInitialFunded: false,
        isProfileWarningDisplayed: false,
      },
    };
    mockUseStore.mockReturnValue({ storeState });

    const { result } = renderHook(() => useIsInitiallyFunded());
    expect(result.current.isInitialFunded).toBe(false);
  });

  it('returns isInitialFunded=undefined when agent settings are missing from store', () => {
    mockUseStore.mockReturnValue({ storeState: {} });

    const { result } = renderHook(() => useIsInitiallyFunded());
    expect(result.current.isInitialFunded).toBeUndefined();
  });

  it('returns isInitialFunded=undefined when storeState is undefined', () => {
    mockUseStore.mockReturnValue({ storeState: undefined });

    const { result } = renderHook(() => useIsInitiallyFunded());
    expect(result.current.isInitialFunded).toBeUndefined();
  });

  it('reads isInitialFunded for the correct agent type (AgentsFun)', () => {
    mockUseServices.mockReturnValue({
      selectedAgentType: AgentMap.AgentsFun,
    });
    const storeState: Partial<ElectronStore> = {
      [AgentMap.AgentsFun]: {
        isInitialFunded: true,
        isProfileWarningDisplayed: false,
      },
      [AgentMap.PredictTrader]: {
        isInitialFunded: false,
        isProfileWarningDisplayed: false,
      },
    };
    mockUseStore.mockReturnValue({ storeState });

    const { result } = renderHook(() => useIsInitiallyFunded());
    expect(result.current.isInitialFunded).toBe(true);
  });

  it('calls store.set with the correct key when setIsInitiallyFunded is invoked', () => {
    mockUseStore.mockReturnValue({ storeState: {} });

    const { result } = renderHook(() => useIsInitiallyFunded());

    act(() => {
      result.current.setIsInitiallyFunded();
    });
    expect(mockSetStore).toHaveBeenCalledWith(
      `${AgentMap.PredictTrader}.isInitialFunded`,
      true,
    );
  });

  it('uses the selected agent type in the store key for setIsInitiallyFunded', () => {
    mockUseServices.mockReturnValue({
      selectedAgentType: AgentMap.Modius,
    });
    mockUseStore.mockReturnValue({ storeState: {} });

    const { result } = renderHook(() => useIsInitiallyFunded());

    act(() => {
      result.current.setIsInitiallyFunded();
    });
    expect(mockSetStore).toHaveBeenCalledWith(
      `${AgentMap.Modius}.isInitialFunded`,
      true,
    );
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
