import { renderHook } from '@testing-library/react';

import { AddressZero } from '../../constants/address';
import { EvmChainIdMap } from '../../constants/chains';
import { WALLET_OWNER, WALLET_TYPE } from '../../constants/wallet';
import { useAgentFundingRequests } from '../../hooks/useAgentFundingRequests';
import { useBalanceAndRefillRequirementsContext } from '../../hooks/useBalanceAndRefillRequirementsContext';
import { useService } from '../../hooks/useService';
import { useServices } from '../../hooks/useServices';
import { AddressBalanceRecord } from '../../types/Funding';
import {
  AGENT_KEY_ADDRESS,
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
  DEFAULT_SERVICE_CONFIG_ID,
  UNKNOWN_TOKEN_ADDRESS,
} from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

jest.mock('../../constants/providers', () => ({ PROVIDERS: {} }));

jest.mock('../../hooks/useBalanceAndRefillRequirementsContext', () => ({
  useBalanceAndRefillRequirementsContext: jest.fn(),
}));

jest.mock('../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));

jest.mock('../../hooks/useService', () => ({
  useService: jest.fn(),
}));

const mockUseBalanceAndRefillRequirementsContext =
  useBalanceAndRefillRequirementsContext as jest.MockedFunction<
    typeof useBalanceAndRefillRequirementsContext
  >;

const mockUseServices = useServices as jest.MockedFunction<typeof useServices>;

const mockUseService = useService as jest.MockedFunction<typeof useService>;

const GNOSIS_CHAIN_ID = EvmChainIdMap.Gnosis;

const defaultSelectedAgentConfig = {
  evmHomeChainId: GNOSIS_CHAIN_ID,
} as ReturnType<typeof useServices>['selectedAgentConfig'];

const defaultSelectedService = {
  service_config_id: DEFAULT_SERVICE_CONFIG_ID,
} as ReturnType<typeof useServices>['selectedService'];

const defaultServiceEoa = {
  address: DEFAULT_EOA_ADDRESS,
  type: WALLET_TYPE.EOA as typeof WALLET_TYPE.EOA,
  owner: WALLET_OWNER.Agent as typeof WALLET_OWNER.Agent,
};

type SetupMocksOptions = {
  agentFundingRequests?: AddressBalanceRecord;
  isAgentFundingRequestsStale?: boolean;
  selectedAgentConfig?: ReturnType<typeof useServices>['selectedAgentConfig'];
  selectedService?: ReturnType<typeof useServices>['selectedService'];
  serviceEoa?: typeof defaultServiceEoa | null;
};

function setupMocks(options: SetupMocksOptions = {}) {
  const {
    agentFundingRequests,
    isAgentFundingRequestsStale = false,
    selectedAgentConfig = defaultSelectedAgentConfig,
    selectedService = defaultSelectedService,
  } = options;

  const serviceEoa =
    'serviceEoa' in options ? options.serviceEoa : defaultServiceEoa;

  mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
    agentFundingRequests,
    isAgentFundingRequestsStale,
  } as ReturnType<typeof useBalanceAndRefillRequirementsContext>);

  mockUseServices.mockReturnValue({
    selectedAgentConfig,
    selectedService,
  } as ReturnType<typeof useServices>);

  mockUseService.mockReturnValue({
    serviceEoa,
  } as ReturnType<typeof useService>);
}

describe('useAgentFundingRequests', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns null for all values when agentFundingRequests is null/undefined', () => {
    setupMocks({ agentFundingRequests: undefined });

    const { result } = renderHook(() => useAgentFundingRequests());

    expect(result.current.agentTokenRequirements).toBeNull();
    expect(result.current.eoaTokenRequirements).toBeNull();
    expect(result.current.agentTokenRequirementsFormatted).toBeNull();
    expect(result.current.isAgentBalanceLow).toBeNull();
  });

  it('returns null for all values when isAgentFundingRequestsStale is true', () => {
    const fundingRequests: AddressBalanceRecord = {
      [DEFAULT_EOA_ADDRESS]: { [AddressZero]: '1000' },
    };
    setupMocks({
      agentFundingRequests: fundingRequests,
      isAgentFundingRequestsStale: true,
    });

    const { result } = renderHook(() => useAgentFundingRequests());

    expect(result.current.agentTokenRequirements).toBeNull();
    expect(result.current.eoaTokenRequirements).toBeNull();
    expect(result.current.agentTokenRequirementsFormatted).toBeNull();
    expect(result.current.isAgentBalanceLow).toBeNull();
  });

  it('consolidates amounts from a single wallet into agentTokenRequirements', () => {
    const fundingRequests: AddressBalanceRecord = {
      [DEFAULT_EOA_ADDRESS]: {
        [AddressZero]: '1000000000000000000',
        [UNKNOWN_TOKEN_ADDRESS]: '500',
      },
    };
    setupMocks({ agentFundingRequests: fundingRequests });

    const { result } = renderHook(() => useAgentFundingRequests());

    expect(result.current.agentTokenRequirements).toEqual({
      [AddressZero]: '1000000000000000000',
      [UNKNOWN_TOKEN_ADDRESS]: '500',
    });
  });

  it('consolidates amounts from multiple wallets by summing BigInt values', () => {
    const fundingRequests: AddressBalanceRecord = {
      [DEFAULT_EOA_ADDRESS]: {
        [AddressZero]: '1000000000000000000',
        [UNKNOWN_TOKEN_ADDRESS]: '200',
      },
      [DEFAULT_SAFE_ADDRESS]: {
        [AddressZero]: '2000000000000000000',
        [UNKNOWN_TOKEN_ADDRESS]: '300',
      },
    };
    setupMocks({ agentFundingRequests: fundingRequests });

    const { result } = renderHook(() => useAgentFundingRequests());

    expect(result.current.agentTokenRequirements).toEqual({
      [AddressZero]: '3000000000000000000',
      [UNKNOWN_TOKEN_ADDRESS]: '500',
    });
  });

  it('consolidates amounts from three wallets correctly', () => {
    const fundingRequests: AddressBalanceRecord = {
      [DEFAULT_EOA_ADDRESS]: { [AddressZero]: '100' },
      [DEFAULT_SAFE_ADDRESS]: { [AddressZero]: '200' },
      [AGENT_KEY_ADDRESS]: { [AddressZero]: '300' },
    };
    setupMocks({ agentFundingRequests: fundingRequests });

    const { result } = renderHook(() => useAgentFundingRequests());

    expect(result.current.agentTokenRequirements).toEqual({
      [AddressZero]: '600',
    });
  });

  describe('isAgentBalanceLow', () => {
    it('returns true when any token amount is greater than 0', () => {
      const fundingRequests: AddressBalanceRecord = {
        [DEFAULT_EOA_ADDRESS]: {
          [AddressZero]: '1000000000000000000',
        },
      };
      setupMocks({ agentFundingRequests: fundingRequests });

      const { result } = renderHook(() => useAgentFundingRequests());

      expect(result.current.isAgentBalanceLow).toBe(true);
    });

    it('returns false when all token amounts are 0', () => {
      const fundingRequests: AddressBalanceRecord = {
        [DEFAULT_EOA_ADDRESS]: {
          [AddressZero]: '0',
          [UNKNOWN_TOKEN_ADDRESS]: '0',
        },
      };
      setupMocks({ agentFundingRequests: fundingRequests });

      const { result } = renderHook(() => useAgentFundingRequests());

      expect(result.current.isAgentBalanceLow).toBe(false);
    });

    it('returns true when at least one of multiple tokens is greater than 0', () => {
      const fundingRequests: AddressBalanceRecord = {
        [DEFAULT_EOA_ADDRESS]: {
          [AddressZero]: '0',
          [UNKNOWN_TOKEN_ADDRESS]: '1',
        },
      };
      setupMocks({ agentFundingRequests: fundingRequests });

      const { result } = renderHook(() => useAgentFundingRequests());

      expect(result.current.isAgentBalanceLow).toBe(true);
    });
  });

  describe('eoaTokenRequirements', () => {
    it('returns requirements for the service EOA address', () => {
      const eoaBalanceRecord = {
        [AddressZero]: '500',
        [UNKNOWN_TOKEN_ADDRESS]: '100',
      };
      const fundingRequests: AddressBalanceRecord = {
        [DEFAULT_EOA_ADDRESS]: eoaBalanceRecord,
        [DEFAULT_SAFE_ADDRESS]: { [AddressZero]: '999' },
      };
      setupMocks({ agentFundingRequests: fundingRequests });

      const { result } = renderHook(() => useAgentFundingRequests());

      expect(result.current.eoaTokenRequirements).toEqual(eoaBalanceRecord);
    });

    it('returns null when serviceEoa is null', () => {
      const fundingRequests: AddressBalanceRecord = {
        [DEFAULT_EOA_ADDRESS]: { [AddressZero]: '500' },
      };
      setupMocks({
        agentFundingRequests: fundingRequests,
        serviceEoa: null,
      });

      const { result } = renderHook(() => useAgentFundingRequests());

      expect(result.current.eoaTokenRequirements).toBeNull();
    });

    it('returns null when EOA address is not in funding requests', () => {
      const fundingRequests: AddressBalanceRecord = {
        [DEFAULT_SAFE_ADDRESS]: { [AddressZero]: '500' },
      };
      setupMocks({ agentFundingRequests: fundingRequests });

      const { result } = renderHook(() => useAgentFundingRequests());

      expect(result.current.eoaTokenRequirements).toBeNull();
    });

    it('returns null when agentFundingRequests is undefined', () => {
      setupMocks({ agentFundingRequests: undefined });

      const { result } = renderHook(() => useAgentFundingRequests());

      expect(result.current.eoaTokenRequirements).toBeNull();
    });

    it('returns null when isAgentFundingRequestsStale is true', () => {
      const fundingRequests: AddressBalanceRecord = {
        [DEFAULT_EOA_ADDRESS]: { [AddressZero]: '500' },
      };
      setupMocks({
        agentFundingRequests: fundingRequests,
        isAgentFundingRequestsStale: true,
      });

      const { result } = renderHook(() => useAgentFundingRequests());

      expect(result.current.eoaTokenRequirements).toBeNull();
    });
  });

  describe('agentTokenRequirementsFormatted', () => {
    it('returns a formatted string for native token requirements', () => {
      const fundingRequests: AddressBalanceRecord = {
        [DEFAULT_EOA_ADDRESS]: {
          [AddressZero]: '1500000000000000000',
        },
      };
      setupMocks({ agentFundingRequests: fundingRequests });

      const { result } = renderHook(() => useAgentFundingRequests());

      expect(result.current.agentTokenRequirementsFormatted).toBe(
        '1.5000 XDAI on Gnosis chain',
      );
    });

    it('returns null when agentTokenRequirements is null', () => {
      setupMocks({ agentFundingRequests: undefined });

      const { result } = renderHook(() => useAgentFundingRequests());

      expect(result.current.agentTokenRequirementsFormatted).toBeNull();
    });

    it('returns null when no tokens can be resolved from config', () => {
      const fundingRequests: AddressBalanceRecord = {
        [DEFAULT_EOA_ADDRESS]: {
          [UNKNOWN_TOKEN_ADDRESS]: '500',
        },
      };
      setupMocks({ agentFundingRequests: fundingRequests });

      const { result } = renderHook(() => useAgentFundingRequests());

      expect(result.current.agentTokenRequirementsFormatted).toBeNull();
    });
  });
});
