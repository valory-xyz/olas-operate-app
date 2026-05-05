import { renderHook, waitFor } from '@testing-library/react';
import React, { PropsWithChildren, useContext } from 'react';

import { AgentMap } from '../../constants/agent';
import {
  SharedContext,
  SharedProvider,
} from '../../context/SharedProvider/SharedProvider';
import { useServices } from '../../hooks/useServices';
import { Service } from '../../types/Service';
import { makeService as makeFactoryService } from '../helpers/factories';

jest.mock('ethers-multicall', () => ({ Contract: jest.fn() }));
jest.mock('../../constants/providers', () => ({}));
jest.mock('../../config/providers', () => ({ providers: [] }));

jest.mock('../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));
jest.mock('../../context/OnlineStatusProvider', () => ({
  useOnlineStatus: jest.fn().mockReturnValue({ isOnline: true }),
}));
jest.mock('../../service/Recovery', () => ({
  RecoveryService: {
    getRecoveryStatus: jest.fn().mockResolvedValue({ has_swaps: false }),
  },
}));

// Mock react-query so we can control the recovery query
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn().mockReturnValue({
    data: false,
    isLoading: false,
  }),
}));

const mockUseServices = useServices as jest.MockedFunction<typeof useServices>;

const makeServiceWithEnv = (
  envVars: Record<string, { value: string | null }>,
) =>
  makeFactoryService({
    env_variables: envVars as Service['env_variables'],
  });

const TWEEPY_KEYS = [
  'TWEEPY_CONSUMER_API_KEY',
  'TWEEPY_CONSUMER_API_KEY_SECRET',
  'TWEEPY_BEARER_TOKEN',
  'TWEEPY_ACCESS_TOKEN',
  'TWEEPY_ACCESS_TOKEN_SECRET',
];

const allTweepyFieldsSet = TWEEPY_KEYS.reduce(
  (acc, key) => ({ ...acc, [key]: { value: 'some-value' } }),
  {},
);

const wrapper = ({ children }: PropsWithChildren) => (
  <SharedProvider>{children}</SharedProvider>
);

const useSharedContextHook = () => useContext(SharedContext);

describe('SharedProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServices.mockReturnValue({
      selectedAgentType: null,
      selectedService: null,
    } as unknown as ReturnType<typeof useServices>);
  });

  describe('isAgentsFunFieldUpdateRequired', () => {
    it('is false when selectedAgentType is null', () => {
      mockUseServices.mockReturnValue({
        selectedAgentType: null,
        selectedService: null,
      } as unknown as ReturnType<typeof useServices>);

      const { result } = renderHook(() => useSharedContextHook(), { wrapper });
      expect(result.current.isAgentsFunFieldUpdateRequired).toBe(false);
    });

    it('is false when selectedAgentType is not AgentsFun', () => {
      mockUseServices.mockReturnValue({
        selectedAgentType: AgentMap.PredictTrader,
        selectedService: makeServiceWithEnv({}),
      } as unknown as ReturnType<typeof useServices>);

      const { result } = renderHook(() => useSharedContextHook(), { wrapper });
      expect(result.current.isAgentsFunFieldUpdateRequired).toBe(false);
    });

    it('is false when AgentsFun and all tweepy fields are set', async () => {
      mockUseServices.mockReturnValue({
        selectedAgentType: AgentMap.AgentsFun,
        selectedService: makeServiceWithEnv(allTweepyFieldsSet),
      } as unknown as ReturnType<typeof useServices>);

      const { result } = renderHook(() => useSharedContextHook(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAgentsFunFieldUpdateRequired).toBe(false);
      });
    });

    it('is true when AgentsFun and a tweepy field is missing', async () => {
      const partialFields = { ...allTweepyFieldsSet };
      delete (partialFields as Record<string, unknown>)['TWEEPY_BEARER_TOKEN'];

      mockUseServices.mockReturnValue({
        selectedAgentType: AgentMap.AgentsFun,
        selectedService: makeServiceWithEnv(partialFields),
      } as unknown as ReturnType<typeof useServices>);

      const { result } = renderHook(() => useSharedContextHook(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAgentsFunFieldUpdateRequired).toBe(true);
      });
    });

    it('is true when AgentsFun and a tweepy field has null value', async () => {
      const fieldsWithNull = {
        ...allTweepyFieldsSet,
        TWEEPY_ACCESS_TOKEN: { value: null },
      };

      mockUseServices.mockReturnValue({
        selectedAgentType: AgentMap.AgentsFun,
        selectedService: makeServiceWithEnv(fieldsWithNull),
      } as unknown as ReturnType<typeof useServices>);

      const { result } = renderHook(() => useSharedContextHook(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAgentsFunFieldUpdateRequired).toBe(true);
      });
    });

    it('is true when AgentsFun and a tweepy field has empty string value', async () => {
      const fieldsWithEmpty = {
        ...allTweepyFieldsSet,
        TWEEPY_ACCESS_TOKEN_SECRET: { value: '' },
      };

      mockUseServices.mockReturnValue({
        selectedAgentType: AgentMap.AgentsFun,
        selectedService: makeServiceWithEnv(fieldsWithEmpty),
      } as unknown as ReturnType<typeof useServices>);

      const { result } = renderHook(() => useSharedContextHook(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAgentsFunFieldUpdateRequired).toBe(true);
      });
    });

    it('skips check when AgentsFun but selectedService is null', () => {
      mockUseServices.mockReturnValue({
        selectedAgentType: AgentMap.AgentsFun,
        selectedService: null,
      } as unknown as ReturnType<typeof useServices>);

      const { result } = renderHook(() => useSharedContextHook(), { wrapper });
      // State stays at initial (false) since useEffect returns early
      expect(result.current.isAgentsFunFieldUpdateRequired).toBe(false);
    });
  });
});
