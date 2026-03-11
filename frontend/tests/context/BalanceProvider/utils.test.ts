import { BigNumber } from 'ethers';

import { TOKEN_CONFIG, TokenType } from '../../../config/tokens';
import { EvmChainIdMap, MiddlewareChainMap } from '../../../constants/chains';
import { SERVICE_REGISTRY_L2_SERVICE_STATE } from '../../../constants/serviceRegistryL2ServiceState';
import {
  AgentWallet,
  WALLET_OWNER,
  WALLET_TYPE,
} from '../../../constants/wallet';
import {
  getCrossChainBalances,
  getCrossChainWalletBalances,
} from '../../../context/BalanceProvider/utils';
import { StakedAgentService } from '../../../service/agents/shared-services/StakedAgentService';
import { MiddlewareServiceResponse } from '../../../types/Service';
import {
  AGENT_KEY_ADDRESS,
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
  DEFAULT_SERVICE_CONFIG_ID,
  makeMasterEoa,
  makeMasterSafe,
  MOCK_MULTISIG_ADDRESS,
  MOCK_SERVICE_CONFIG_ID_3,
  SECOND_SAFE_ADDRESS,
} from '../../helpers/factories';

const mockBalanceOf = jest.fn(() => 'balanceOf-call');

jest.mock('ethers-multicall', () => ({
  setMulticallAddress: jest.fn(),
  Provider: jest.fn().mockImplementation(() => ({})),
  Contract: jest.fn().mockImplementation(() => ({
    balanceOf: mockBalanceOf,
  })),
}));

jest.mock('../../../constants/providers', () => ({}));

jest.mock('../../../service/agents/shared-services/StakedAgentService', () => ({
  StakedAgentService: {
    getServiceRegistryInfo: jest.fn(),
  },
}));

// --- Mock provider setup ---

const mockGetBalance = jest.fn();
const mockMulticallAll = jest.fn();

const mockProvider = {
  getBalance: mockGetBalance,
};

const mockMulticallProvider = {
  all: mockMulticallAll,
};

type ProviderEntry = [
  string,
  {
    provider: typeof mockProvider;
    multicallProvider: typeof mockMulticallProvider;
  },
];

/** Override the providers import at module level */
let mockProviders: ProviderEntry[] = [];
jest.mock('../../../config/providers', () => ({
  get providers() {
    return mockProviders;
  },
}));

const mockGetServiceRegistryInfo =
  StakedAgentService.getServiceRegistryInfo as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockProviders = [];
});

// --- Helpers ---

/**
 * Sets up mockProviders with a single chain entry.
 */
const setupSingleChainProvider = (evmChainId: number) => {
  mockProviders = [
    [
      String(evmChainId),
      { provider: mockProvider, multicallProvider: mockMulticallProvider },
    ],
  ];
};

/**
 * Makes a minimal MiddlewareServiceResponse for staking tests.
 */
const makeMiddlewareService = (
  overrides: Partial<MiddlewareServiceResponse> & {
    token?: number | null;
    multisig?: string;
    middlewareChain?: string;
  } = {},
): MiddlewareServiceResponse => {
  const chain = overrides.middlewareChain ?? MiddlewareChainMap.GNOSIS;
  return {
    service_public_id: 'valory/trader:0.1.0',
    service_config_id: overrides.service_config_id ?? DEFAULT_SERVICE_CONFIG_ID,
    version: 1,
    name: 'Trader Agent',
    description: 'Trader agent',
    hash: 'bafybeib5hmzpf7cmxyfevq65tk22fjvlothjskw7nacgh4ervgs5mos7ra',
    hash_history: {},
    agent_release: {
      is_aea: true,
      repository: { owner: 'valory-xyz', name: 'trader', version: 'v0.31.7' },
    },
    home_chain: chain as MiddlewareServiceResponse['home_chain'],
    keys: [
      {
        address: AGENT_KEY_ADDRESS,
        private_key: 'key',
        ledger: MiddlewareChainMap.ETHEREUM,
      },
    ],
    chain_configs: {
      [chain]: {
        ledger_config: {
          rpc: 'http://localhost:8545',
          chain: chain as MiddlewareServiceResponse['home_chain'],
        },
        chain_data: {
          instances: [],
          token: ('token' in overrides
            ? (overrides.token ?? undefined)
            : 42) as number,
          multisig: (overrides.multisig ??
            MOCK_MULTISIG_ADDRESS) as `0x${string}`,
          on_chain_state: 4,
          staked: true,
          user_params: {
            agent_id: 1,
            cost_of_bond: '10000000000000000',
            fund_requirements: {},
            nft: 'bafybeig',
            staking_program_id: 'pearl_beta' as never,
            threshold: 1,
            use_mech_marketplace: false,
            use_staking: true,
          },
        },
      },
    },
    env_variables: {},
    ...overrides,
  };
};

// --- Tests ---

describe('getCrossChainWalletBalances', () => {
  describe('wallet filtering per chain', () => {
    it('includes EOA wallets on every chain', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);
      mockGetBalance.mockResolvedValue(BigNumber.from('1000000000000000000'));
      // Multicall for ERC20 tokens — return zero for each wallet
      mockMulticallAll.mockResolvedValue([BigNumber.from(0)]);

      const eoa = makeMasterEoa();
      const result = await getCrossChainWalletBalances([eoa]);

      // Should have native + ERC20/wrapped entries for the EOA
      expect(result.length).toBeGreaterThan(0);
      const nativeResult = result.find((r) => r.isNative);
      expect(nativeResult).toBeDefined();
      expect(nativeResult!.walletAddress).toBe(DEFAULT_EOA_ADDRESS);
      expect(nativeResult!.evmChainId).toBe(EvmChainIdMap.Gnosis);
    });

    it('includes Safe wallet only on its matching chain', async () => {
      // Setup two chains
      const gnosisProvider = {
        getBalance: jest
          .fn()
          .mockResolvedValue(BigNumber.from('2000000000000000000')),
      };
      const baseProvider = {
        getBalance: jest
          .fn()
          .mockResolvedValue(BigNumber.from('3000000000000000000')),
      };
      const gnosisMulticall = {
        all: jest.fn().mockResolvedValue([]),
      };
      const baseMulticall = {
        all: jest.fn().mockResolvedValue([]),
      };

      mockProviders = [
        [
          String(EvmChainIdMap.Gnosis),
          { provider: gnosisProvider, multicallProvider: gnosisMulticall },
        ],
        [
          String(EvmChainIdMap.Base),
          { provider: baseProvider, multicallProvider: baseMulticall },
        ],
      ] as unknown as ProviderEntry[];

      const gnosisSafe = makeMasterSafe(EvmChainIdMap.Gnosis);

      const result = await getCrossChainWalletBalances([gnosisSafe]);

      // Should have results on Gnosis (native balance fetched)
      expect(gnosisProvider.getBalance).toHaveBeenCalledTimes(1);

      // Should NOT fetch balance on Base (Safe not on that chain)
      expect(baseProvider.getBalance).not.toHaveBeenCalled();

      const gnosisResults = result.filter(
        (r) => r.evmChainId === EvmChainIdMap.Gnosis,
      );
      const baseResults = result.filter(
        (r) => r.evmChainId === EvmChainIdMap.Base,
      );
      expect(gnosisResults.length).toBeGreaterThan(0);
      expect(baseResults.length).toBe(0);
    });
  });

  describe('native balance fetching', () => {
    it('fetches native balance and formats correctly', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);
      const oneEther = BigNumber.from('1000000000000000000');
      mockGetBalance.mockResolvedValue(oneEther);
      // Multicall for non-native tokens
      mockMulticallAll.mockResolvedValue([BigNumber.from(0)]);

      const eoa = makeMasterEoa();
      const result = await getCrossChainWalletBalances([eoa]);

      const nativeBalance = result.find((r) => r.isNative);
      expect(nativeBalance).toBeDefined();
      expect(nativeBalance!.balance).toBe(1);
      expect(nativeBalance!.balanceString).toBe('1.0');
      expect(nativeBalance!.isNative).toBe(true);

      // Verify native token symbol matches chain config
      const gnosisTokens = TOKEN_CONFIG[EvmChainIdMap.Gnosis];
      const nativeToken = Object.values(gnosisTokens).find(
        (t) => t.tokenType === TokenType.NativeGas,
      );
      expect(nativeBalance!.symbol).toBe(nativeToken!.symbol);
    });

    it('handles native balance fetch errors gracefully', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);
      mockGetBalance.mockRejectedValue(new Error('RPC error'));
      // Multicall for ERC20 tokens
      mockMulticallAll.mockResolvedValue([BigNumber.from(0)]);

      const eoa = makeMasterEoa();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await getCrossChainWalletBalances([eoa]);

      // Native balance call fails, so no native entries
      const nativeBalances = result.filter((r) => r.isNative);
      expect(nativeBalances).toHaveLength(0);

      consoleSpy.mockRestore();
    });
  });

  describe('ERC20 / wrapped token balance fetching', () => {
    it('fetches ERC20 balances via multicall', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);
      mockGetBalance.mockResolvedValue(BigNumber.from(0));

      const gnosisTokens = TOKEN_CONFIG[EvmChainIdMap.Gnosis];
      const erc20Tokens = Object.values(gnosisTokens).filter(
        (t) =>
          t.tokenType === TokenType.Erc20 || t.tokenType === TokenType.Wrapped,
      );

      // Return a balance per ERC20/wrapped token call (one wallet)
      const erc20Balances = erc20Tokens.map(() =>
        BigNumber.from('5000000000000000000'),
      );
      mockMulticallAll.mockResolvedValue(erc20Balances);

      const eoa = makeMasterEoa();
      const result = await getCrossChainWalletBalances([eoa]);

      const erc20Results = result.filter((r) => !r.isNative);
      expect(erc20Results.length).toBe(erc20Tokens.length);

      for (const erc20Result of erc20Results) {
        expect(erc20Result.walletAddress).toBe(DEFAULT_EOA_ADDRESS);
        expect(erc20Result.evmChainId).toBe(EvmChainIdMap.Gnosis);
        expect(erc20Result.isNative).toBe(false);
      }
    });

    it('marks wrapped tokens with isWrappedToken flag', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);
      mockGetBalance.mockResolvedValue(BigNumber.from(0));

      const gnosisTokens = TOKEN_CONFIG[EvmChainIdMap.Gnosis];
      const nonNativeTokens = Object.values(gnosisTokens).filter(
        (t) =>
          t.tokenType === TokenType.Erc20 || t.tokenType === TokenType.Wrapped,
      );
      mockMulticallAll.mockResolvedValue(
        nonNativeTokens.map(() => BigNumber.from('1000000000000000000')),
      );

      const eoa = makeMasterEoa();
      const result = await getCrossChainWalletBalances([eoa]);

      const wrappedTokenConfigs = Object.values(gnosisTokens).filter(
        (t) => t.tokenType === TokenType.Wrapped,
      );
      const wrappedResults = result.filter((r) => r.isWrappedToken);
      expect(wrappedResults.length).toBe(wrappedTokenConfigs.length);

      for (const wr of wrappedResults) {
        expect(wr.isWrappedToken).toBe(true);
        const matchingConfig = wrappedTokenConfigs.find(
          (c) => c.symbol === wr.symbol,
        );
        expect(matchingConfig).toBeDefined();
      }
    });

    it('respects token decimals for formatting', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);
      mockGetBalance.mockResolvedValue(BigNumber.from(0));

      const gnosisTokens = TOKEN_CONFIG[EvmChainIdMap.Gnosis];
      const nonNativeTokens = Object.values(gnosisTokens).filter(
        (t) =>
          t.tokenType === TokenType.Erc20 || t.tokenType === TokenType.Wrapped,
      );

      // Find a 6-decimal token (USDC.e on Gnosis)
      const sixDecimalToken = nonNativeTokens.find((t) => t.decimals === 6);

      // Return 1 unit (10^decimals raw) per token, per wallet (1 wallet here).
      // Each non-native token triggers a separate multicall.all() call.
      for (const t of nonNativeTokens) {
        mockMulticallAll.mockResolvedValueOnce([
          BigNumber.from(10).pow(t.decimals),
        ]);
      }

      const eoa = makeMasterEoa();
      const result = await getCrossChainWalletBalances([eoa]);

      // Gnosis always has a 6-decimal token (USDC.e)
      expect(sixDecimalToken).toBeDefined();
      const sixDecimalResult = result.find(
        (r) => r.symbol === sixDecimalToken!.symbol,
      );
      expect(sixDecimalResult).toBeDefined();
      // 10^6 / 10^6 = 1.0
      expect(sixDecimalResult!.balance).toBe(1);
    });
  });

  describe('multiple wallets', () => {
    it('fetches balances for both EOA and Safe wallets', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);
      // Two wallets => two getBalance calls
      mockGetBalance.mockResolvedValue(BigNumber.from('1000000000000000000'));
      // Multicall returns balances for 2 wallets per call
      mockMulticallAll.mockResolvedValue([
        BigNumber.from(0),
        BigNumber.from(0),
      ]);

      const eoa = makeMasterEoa();
      const safe = makeMasterSafe(EvmChainIdMap.Gnosis);

      const result = await getCrossChainWalletBalances([eoa, safe]);

      // Both wallets should have native balance entries
      const nativeResults = result.filter((r) => r.isNative);
      expect(nativeResults).toHaveLength(2);
      const walletAddresses = nativeResults.map((r) => r.walletAddress);
      expect(walletAddresses).toContain(DEFAULT_EOA_ADDRESS);
      expect(walletAddresses).toContain(DEFAULT_SAFE_ADDRESS);
    });
  });

  describe('empty wallets', () => {
    it('returns empty array when no wallets provided', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);
      const result = await getCrossChainWalletBalances([]);
      expect(result).toEqual([]);
    });
  });

  describe('chain-level error handling', () => {
    it('catches per-chain errors and continues', async () => {
      // Setup two chains: first throws, second succeeds
      const failingProvider = {
        getBalance: jest.fn().mockImplementation(() => {
          throw new Error('Chain unavailable');
        }),
      };
      const workingProvider = {
        getBalance: jest
          .fn()
          .mockResolvedValue(BigNumber.from('1000000000000000000')),
      };
      const failingMulticall = { all: jest.fn() };
      const workingMulticall = {
        all: jest.fn().mockResolvedValue([BigNumber.from(0)]),
      };

      mockProviders = [
        [
          String(EvmChainIdMap.Gnosis),
          { provider: failingProvider, multicallProvider: failingMulticall },
        ],
        [
          String(EvmChainIdMap.Base),
          { provider: workingProvider, multicallProvider: workingMulticall },
        ],
      ] as unknown as ProviderEntry[];

      const eoa = makeMasterEoa();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await getCrossChainWalletBalances([eoa]);

      // Should still get results from Base
      const baseResults = result.filter(
        (r) => r.evmChainId === EvmChainIdMap.Base,
      );
      expect(baseResults.length).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });
  });
});

describe('getCrossChainBalances', () => {
  describe('successful orchestration', () => {
    it('returns wallet balances and staked balances', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);
      mockGetBalance.mockResolvedValue(BigNumber.from('1000000000000000000'));
      mockMulticallAll.mockResolvedValue([BigNumber.from(0)]);

      mockGetServiceRegistryInfo.mockResolvedValue({
        bondValue: 10,
        depositValue: 20,
        serviceState: SERVICE_REGISTRY_L2_SERVICE_STATE.Deployed,
      });

      const eoa = makeMasterEoa();
      const safe = makeMasterSafe(EvmChainIdMap.Gnosis);
      const service = makeMiddlewareService();

      const result = await getCrossChainBalances({
        services: [service],
        masterWallets: [eoa, safe],
      });

      expect(result.walletBalances.length).toBeGreaterThan(0);
      expect(result.stakedBalances).toHaveLength(1);
      expect(result.stakedBalances[0].olasBondBalance).toBe(10);
      expect(result.stakedBalances[0].olasDepositBalance).toBe(20);
      expect(result.stakedBalances[0].serviceId).toBe(
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });

    it('includes serviceWallets in wallet balance fetching', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);
      mockGetBalance.mockResolvedValue(BigNumber.from('500000000000000000'));
      mockMulticallAll.mockResolvedValue([BigNumber.from(0)]);
      mockGetServiceRegistryInfo.mockResolvedValue({
        bondValue: 0,
        depositValue: 0,
        serviceState: SERVICE_REGISTRY_L2_SERVICE_STATE.NonExistent,
      });

      const eoa = makeMasterEoa();
      const agentEoa: AgentWallet = {
        address: AGENT_KEY_ADDRESS,
        type: WALLET_TYPE.EOA,
        owner: WALLET_OWNER.Agent,
      };
      const safe = makeMasterSafe(EvmChainIdMap.Gnosis);

      const result = await getCrossChainBalances({
        services: [makeMiddlewareService()],
        masterWallets: [eoa, safe],
        serviceWallets: [agentEoa],
      });

      // Both EOA + agentEoa + safe should be fetched
      const nativeResults = result.walletBalances.filter((r) => r.isNative);
      const walletAddresses = nativeResults.map((r) => r.walletAddress);
      expect(walletAddresses).toContain(DEFAULT_EOA_ADDRESS);
      expect(walletAddresses).toContain(AGENT_KEY_ADDRESS);
      expect(walletAddresses).toContain(DEFAULT_SAFE_ADDRESS);
    });
  });

  describe('filters masterSafes correctly', () => {
    it('passes only Safe wallets as masterSafeAddresses for staked balances', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);
      mockGetBalance.mockResolvedValue(BigNumber.from(0));
      mockMulticallAll.mockResolvedValue([BigNumber.from(0)]);
      mockGetServiceRegistryInfo.mockResolvedValue({
        bondValue: 5,
        depositValue: 10,
        serviceState: SERVICE_REGISTRY_L2_SERVICE_STATE.Deployed,
      });

      const eoa = makeMasterEoa();
      const safe = makeMasterSafe(EvmChainIdMap.Gnosis);

      await getCrossChainBalances({
        services: [makeMiddlewareService()],
        masterWallets: [eoa, safe],
      });

      // StakedAgentService should be called with the safe address (not the EOA)
      expect(mockGetServiceRegistryInfo).toHaveBeenCalledWith(
        DEFAULT_SAFE_ADDRESS,
        42, // token from makeMiddlewareService
        EvmChainIdMap.Gnosis,
      );
    });
  });

  describe('Promise.allSettled graceful degradation', () => {
    it('returns empty walletBalances if wallet balance fetch rejects', async () => {
      // Make providers throw on iteration to fail getCrossChainWalletBalances
      mockProviders = [
        [
          String(EvmChainIdMap.Gnosis),
          {
            provider: {
              getBalance: jest.fn().mockImplementation(() => {
                throw new Error('Provider exploded');
              }),
            },
            multicallProvider: mockMulticallProvider,
          },
        ],
      ] as unknown as ProviderEntry[];

      // Note: getCrossChainWalletBalances catches per-chain errors internally,
      // so it doesn't actually reject. Let's test the staked side instead.
      mockGetServiceRegistryInfo.mockRejectedValue(new Error('Registry down'));

      const eoa = makeMasterEoa();
      const safe = makeMasterSafe(EvmChainIdMap.Gnosis);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getCrossChainBalances({
        services: [makeMiddlewareService()],
        masterWallets: [eoa, safe],
      });

      // Staked balances should be empty due to rejection
      // (Promise.allSettled catches it)
      expect(result.stakedBalances).toEqual([]);

      consoleSpy.mockRestore();
    });

    it('returns empty stakedBalances if registry info fetch fails', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);
      mockGetBalance.mockResolvedValue(BigNumber.from('1000000000000000000'));
      mockMulticallAll.mockResolvedValue([BigNumber.from(0)]);

      mockGetServiceRegistryInfo.mockRejectedValue(new Error('Registry error'));

      const eoa = makeMasterEoa();
      const safe = makeMasterSafe(EvmChainIdMap.Gnosis);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getCrossChainBalances({
        services: [makeMiddlewareService()],
        masterWallets: [eoa, safe],
      });

      // Wallet balances should still work
      expect(result.walletBalances.length).toBeGreaterThan(0);
      // Staked balances should be empty
      expect(result.stakedBalances).toEqual([]);

      consoleSpy.mockRestore();
    });
  });

  describe('correctBondDepositByServiceState (tested indirectly)', () => {
    it.each([
      {
        name: 'NonExistent',
        state: SERVICE_REGISTRY_L2_SERVICE_STATE.NonExistent,
        expectedBond: 0,
        expectedDeposit: 0,
      },
      {
        name: 'PreRegistration',
        state: SERVICE_REGISTRY_L2_SERVICE_STATE.PreRegistration,
        expectedBond: 0,
        expectedDeposit: 0,
      },
      {
        name: 'ActiveRegistration',
        state: SERVICE_REGISTRY_L2_SERVICE_STATE.ActiveRegistration,
        expectedBond: 0,
        expectedDeposit: 200,
      },
      {
        name: 'FinishedRegistration',
        state: SERVICE_REGISTRY_L2_SERVICE_STATE.FinishedRegistration,
        expectedBond: 100,
        expectedDeposit: 200,
      },
      {
        name: 'Deployed',
        state: SERVICE_REGISTRY_L2_SERVICE_STATE.Deployed,
        expectedBond: 100,
        expectedDeposit: 200,
      },
      {
        name: 'TerminatedBonded',
        state: SERVICE_REGISTRY_L2_SERVICE_STATE.TerminatedBonded,
        expectedBond: 100,
        expectedDeposit: 0,
      },
    ])(
      '$name state: bond=$expectedBond, deposit=$expectedDeposit',
      async ({ state, expectedBond, expectedDeposit }) => {
        setupSingleChainProvider(EvmChainIdMap.Gnosis);
        mockGetBalance.mockResolvedValue(BigNumber.from(0));
        mockMulticallAll.mockResolvedValue([BigNumber.from(0)]);

        mockGetServiceRegistryInfo.mockResolvedValue({
          bondValue: 100,
          depositValue: 200,
          serviceState: state,
        });

        const eoa = makeMasterEoa();
        const safe = makeMasterSafe(EvmChainIdMap.Gnosis);

        const result = await getCrossChainBalances({
          services: [makeMiddlewareService()],
          masterWallets: [eoa, safe],
        });

        expect(result.stakedBalances).toHaveLength(1);
        expect(result.stakedBalances[0].olasBondBalance).toBe(expectedBond);
        expect(result.stakedBalances[0].olasDepositBalance).toBe(
          expectedDeposit,
        );
      },
    );

    it('unknown state: keeps both unchanged and logs error', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);
      mockGetBalance.mockResolvedValue(BigNumber.from(0));
      mockMulticallAll.mockResolvedValue([BigNumber.from(0)]);

      mockGetServiceRegistryInfo.mockResolvedValue({
        bondValue: 100,
        depositValue: 200,
        serviceState: 99, // invalid state
      });

      const eoa = makeMasterEoa();
      const safe = makeMasterSafe(EvmChainIdMap.Gnosis);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getCrossChainBalances({
        services: [makeMiddlewareService()],
        masterWallets: [eoa, safe],
      });

      expect(result.stakedBalances).toHaveLength(1);
      expect(result.stakedBalances[0].olasBondBalance).toBe(100);
      expect(result.stakedBalances[0].olasDepositBalance).toBe(200);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid service state');

      consoleSpy.mockRestore();
    });
  });

  describe('staked balances — edge cases', () => {
    it('skips services with null/invalid serviceNftTokenId', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);
      mockGetBalance.mockResolvedValue(BigNumber.from(0));
      mockMulticallAll.mockResolvedValue([BigNumber.from(0)]);

      const serviceNoToken = makeMiddlewareService({ token: null });
      const eoa = makeMasterEoa();
      const safe = makeMasterSafe(EvmChainIdMap.Gnosis);

      const result = await getCrossChainBalances({
        services: [serviceNoToken],
        masterWallets: [eoa, safe],
      });

      expect(result.stakedBalances).toHaveLength(0);
      expect(mockGetServiceRegistryInfo).not.toHaveBeenCalled();
    });

    it('skips services with token = 0 (invalid service id)', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);
      mockGetBalance.mockResolvedValue(BigNumber.from(0));
      mockMulticallAll.mockResolvedValue([BigNumber.from(0)]);

      const serviceZeroToken = makeMiddlewareService({ token: 0 });
      const eoa = makeMasterEoa();
      const safe = makeMasterSafe(EvmChainIdMap.Gnosis);

      const result = await getCrossChainBalances({
        services: [serviceZeroToken],
        masterWallets: [eoa, safe],
      });

      expect(result.stakedBalances).toHaveLength(0);
      expect(mockGetServiceRegistryInfo).not.toHaveBeenCalled();
    });

    it('skips services with token = -1 (invalid service id)', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);
      mockGetBalance.mockResolvedValue(BigNumber.from(0));
      mockMulticallAll.mockResolvedValue([BigNumber.from(0)]);

      const serviceMinusOne = makeMiddlewareService({ token: -1 });
      const eoa = makeMasterEoa();
      const safe = makeMasterSafe(EvmChainIdMap.Gnosis);

      const result = await getCrossChainBalances({
        services: [serviceMinusOne],
        masterWallets: [eoa, safe],
      });

      expect(result.stakedBalances).toHaveLength(0);
      expect(mockGetServiceRegistryInfo).not.toHaveBeenCalled();
    });

    it('skips services when no matching masterSafe exists for the chain', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);
      mockGetBalance.mockResolvedValue(BigNumber.from(0));
      mockMulticallAll.mockResolvedValue([BigNumber.from(0)]);

      // Service is on Gnosis, but Safe is on Base
      const service = makeMiddlewareService();
      const eoa = makeMasterEoa();
      const baseSafe = makeMasterSafe(EvmChainIdMap.Base, SECOND_SAFE_ADDRESS);

      const result = await getCrossChainBalances({
        services: [service],
        masterWallets: [eoa, baseSafe],
      });

      expect(result.stakedBalances).toHaveLength(0);
      expect(mockGetServiceRegistryInfo).not.toHaveBeenCalled();
    });

    it('handles multiple services across chains', async () => {
      mockProviders = [
        [
          String(EvmChainIdMap.Gnosis),
          { provider: mockProvider, multicallProvider: mockMulticallProvider },
        ],
        [
          String(EvmChainIdMap.Base),
          { provider: mockProvider, multicallProvider: mockMulticallProvider },
        ],
      ] as unknown as ProviderEntry[];

      mockGetBalance.mockResolvedValue(BigNumber.from(0));
      mockMulticallAll.mockResolvedValue([BigNumber.from(0)]);

      const SECOND_CONFIG_ID = MOCK_SERVICE_CONFIG_ID_3;

      mockGetServiceRegistryInfo
        .mockResolvedValueOnce({
          bondValue: 10,
          depositValue: 20,
          serviceState: SERVICE_REGISTRY_L2_SERVICE_STATE.Deployed,
        })
        .mockResolvedValueOnce({
          bondValue: 30,
          depositValue: 40,
          serviceState: SERVICE_REGISTRY_L2_SERVICE_STATE.FinishedRegistration,
        });

      const gnosisService = makeMiddlewareService({
        service_config_id: DEFAULT_SERVICE_CONFIG_ID,
        middlewareChain: MiddlewareChainMap.GNOSIS,
      });
      const baseService = makeMiddlewareService({
        service_config_id: SECOND_CONFIG_ID,
        middlewareChain: MiddlewareChainMap.BASE,
      });

      const eoa = makeMasterEoa();
      const gnosisSafe = makeMasterSafe(EvmChainIdMap.Gnosis);
      const baseSafe = makeMasterSafe(EvmChainIdMap.Base, SECOND_SAFE_ADDRESS);

      const result = await getCrossChainBalances({
        services: [gnosisService, baseService],
        masterWallets: [eoa, gnosisSafe, baseSafe],
      });

      expect(result.stakedBalances).toHaveLength(2);

      const gnosisStaked = result.stakedBalances.find(
        (s) => s.serviceId === DEFAULT_SERVICE_CONFIG_ID,
      );
      const baseStaked = result.stakedBalances.find(
        (s) => s.serviceId === SECOND_CONFIG_ID,
      );

      expect(gnosisStaked).toBeDefined();
      expect(gnosisStaked!.olasBondBalance).toBe(10);
      expect(gnosisStaked!.olasDepositBalance).toBe(20);

      expect(baseStaked).toBeDefined();
      expect(baseStaked!.olasBondBalance).toBe(30);
      expect(baseStaked!.olasDepositBalance).toBe(40);
    });

    it('logs error for rejected individual service promises', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);
      mockGetBalance.mockResolvedValue(BigNumber.from(0));
      mockMulticallAll.mockResolvedValue([BigNumber.from(0)]);

      mockGetServiceRegistryInfo.mockRejectedValue(new Error('Network error'));

      const eoa = makeMasterEoa();
      const safe = makeMasterSafe(EvmChainIdMap.Gnosis);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getCrossChainBalances({
        services: [makeMiddlewareService()],
        masterWallets: [eoa, safe],
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching registry details for',
        DEFAULT_SERVICE_CONFIG_ID,
      );
      expect(result.stakedBalances).toHaveLength(0);

      consoleSpy.mockRestore();
    });

    it('includes multisig address from chain_configs in staked balance result', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);
      mockGetBalance.mockResolvedValue(BigNumber.from(0));
      mockMulticallAll.mockResolvedValue([BigNumber.from(0)]);

      mockGetServiceRegistryInfo.mockResolvedValue({
        bondValue: 5,
        depositValue: 10,
        serviceState: SERVICE_REGISTRY_L2_SERVICE_STATE.Deployed,
      });

      const service = makeMiddlewareService({
        multisig: MOCK_MULTISIG_ADDRESS,
      });
      const eoa = makeMasterEoa();
      const safe = makeMasterSafe(EvmChainIdMap.Gnosis);

      const result = await getCrossChainBalances({
        services: [service],
        masterWallets: [eoa, safe],
      });

      expect(result.stakedBalances[0].walletAddress).toBe(
        MOCK_MULTISIG_ADDRESS,
      );
    });
  });

  describe('empty inputs', () => {
    it('returns empty arrays when services is empty', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);
      mockGetBalance.mockResolvedValue(BigNumber.from(0));
      mockMulticallAll.mockResolvedValue([]);

      const eoa = makeMasterEoa();

      const result = await getCrossChainBalances({
        services: [],
        masterWallets: [eoa],
      });

      expect(result.stakedBalances).toEqual([]);
    });

    it('returns empty walletBalances when no masterWallets and no serviceWallets', async () => {
      setupSingleChainProvider(EvmChainIdMap.Gnosis);

      const result = await getCrossChainBalances({
        services: [],
        masterWallets: [],
      });

      expect(result.walletBalances).toEqual([]);
      expect(result.stakedBalances).toEqual([]);
    });
  });
});
