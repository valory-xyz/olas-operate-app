import { renderHook } from '@testing-library/react';

import { AgentMap } from '../../constants/agent';
import { EvmChainIdMap } from '../../constants/chains';
import { useFundingEligibleServices } from '../../hooks/useFundingEligibleServices';
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

const mockUseServices = jest.fn();
const mockUseIsInitiallyFunded = jest.fn();
const mockUseArchivedAgents = jest.fn();

jest.mock('../../hooks/useServices', () => ({
  useServices: () => mockUseServices(),
}));
jest.mock('../../hooks/useIsInitiallyFunded', () => ({
  useIsInitiallyFunded: () => mockUseIsInitiallyFunded(),
}));
jest.mock('../../hooks/useArchivedAgents', () => ({
  useArchivedAgents: () => mockUseArchivedAgents(),
}));

describe('useFundingEligibleServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseServices.mockReturnValue({
      getServiceConfigIdsOf: (chainId: number) =>
        chainId === EvmChainIdMap.Gnosis
          ? [DEFAULT_SERVICE_CONFIG_ID]
          : [],
      getAgentTypeFromService: (serviceConfigId: string | null | undefined) =>
        serviceConfigId === DEFAULT_SERVICE_CONFIG_ID
          ? AgentMap.PredictTrader
          : null,
    });
    mockUseIsInitiallyFunded.mockReturnValue({
      isInstanceInitiallyFunded: () => true,
    });
    mockUseArchivedAgents.mockReturnValue({
      isArchived: () => false,
    });
  });

  describe('isFundingEligible', () => {
    it('returns false when getAgentTypeFromService returns null (unknown service)', () => {
      mockUseServices.mockReturnValue({
        getServiceConfigIdsOf: () => [],
        getAgentTypeFromService: () => null,
      });

      const { result } = renderHook(() => useFundingEligibleServices());
      expect(result.current.isFundingEligible('unknown-service-id')).toBe(
        false,
      );
    });

    it('returns false when service is archived (isArchived true)', () => {
      mockUseArchivedAgents.mockReturnValue({
        isArchived: (id: string) => id === DEFAULT_SERVICE_CONFIG_ID,
      });

      const { result } = renderHook(() => useFundingEligibleServices());
      expect(result.current.isFundingEligible(DEFAULT_SERVICE_CONFIG_ID)).toBe(
        false,
      );
    });

    it('returns false when isInstanceInitiallyFunded is false (ghost service)', () => {
      mockUseIsInitiallyFunded.mockReturnValue({
        isInstanceInitiallyFunded: () => false,
      });

      const { result } = renderHook(() => useFundingEligibleServices());
      expect(result.current.isFundingEligible(DEFAULT_SERVICE_CONFIG_ID)).toBe(
        false,
      );
    });

    it('returns true when service is active, initially funded, and not archived', () => {
      const { result } = renderHook(() => useFundingEligibleServices());
      expect(result.current.isFundingEligible(DEFAULT_SERVICE_CONFIG_ID)).toBe(
        true,
      );
    });
  });

  describe('getFundingEligibleServiceConfigIdsOf', () => {
    it('returns only eligible IDs for the given chain', () => {
      // Three services on Gnosis: eligible, archived, ghost
      mockUseServices.mockReturnValue({
        getServiceConfigIdsOf: (chainId: number) =>
          chainId === EvmChainIdMap.Gnosis
            ? [
                DEFAULT_SERVICE_CONFIG_ID,
                MOCK_SERVICE_CONFIG_ID_2,
                MOCK_SERVICE_CONFIG_ID_3,
              ]
            : [],
        getAgentTypeFromService: (id: string | null | undefined) =>
          id === DEFAULT_SERVICE_CONFIG_ID ||
          id === MOCK_SERVICE_CONFIG_ID_2 ||
          id === MOCK_SERVICE_CONFIG_ID_3
            ? AgentMap.PredictTrader
            : null,
      });
      // MOCK_SERVICE_CONFIG_ID_2 is archived
      mockUseArchivedAgents.mockReturnValue({
        isArchived: (id: string) => id === MOCK_SERVICE_CONFIG_ID_2,
      });
      // MOCK_SERVICE_CONFIG_ID_3 is a ghost (not initially funded)
      mockUseIsInitiallyFunded.mockReturnValue({
        isInstanceInitiallyFunded: (id: string) =>
          id !== MOCK_SERVICE_CONFIG_ID_3,
      });

      const { result } = renderHook(() => useFundingEligibleServices());
      const eligible = result.current.getFundingEligibleServiceConfigIdsOf(
        EvmChainIdMap.Gnosis,
      );
      expect(eligible).toEqual([DEFAULT_SERVICE_CONFIG_ID]);
    });

    it('returns empty array when every service on the chain is ineligible', () => {
      mockUseServices.mockReturnValue({
        getServiceConfigIdsOf: () => [DEFAULT_SERVICE_CONFIG_ID],
        getAgentTypeFromService: () => AgentMap.PredictTrader,
      });
      mockUseArchivedAgents.mockReturnValue({
        isArchived: () => true,
      });

      const { result } = renderHook(() => useFundingEligibleServices());
      expect(
        result.current.getFundingEligibleServiceConfigIdsOf(
          EvmChainIdMap.Gnosis,
        ),
      ).toEqual([]);
    });

    it('returns empty array for a chain with no services', () => {
      mockUseServices.mockReturnValue({
        getServiceConfigIdsOf: () => [],
        getAgentTypeFromService: () => null,
      });

      const { result } = renderHook(() => useFundingEligibleServices());
      expect(
        result.current.getFundingEligibleServiceConfigIdsOf(
          EvmChainIdMap.Polygon,
        ),
      ).toEqual([]);
    });
  });
});
