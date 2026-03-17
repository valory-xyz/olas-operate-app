/**
 * Tests for REACT_QUERY_KEYS factory functions.
 *
 * React Query caches data by key identity. If a key factory returns a different
 * array shape than what was used to cache data, the UI silently shows stale data
 * or refetches unnecessarily on every render.
 *
 * These tests verify:
 * - Each factory returns an array (not a string or object)
 * - The first element is a unique, stable discriminator string
 * - Arguments are embedded in the key in the correct position
 * - Optional/default arguments behave correctly
 * - Static keys (non-factory) are plain arrays
 */

import { REACT_QUERY_KEYS } from '../../constants/reactQueryKeys';

// We need the multicall mock because reactQueryKeys imports from @/constants which
// transitively loads constants/providers.ts, which calls setupMulticallAddresses().
jest.mock(
  'ethers-multicall',
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../mocks/ethersMulticall').ethersMulticallMock,
);

// ─── Static keys (non-factory) ───────────────────────────────────────────────

describe('static (non-factory) keys', () => {
  it('SERVICES_KEY is ["services"]', () => {
    expect(REACT_QUERY_KEYS.SERVICES_KEY).toEqual(['services']);
  });

  it('SERVICES_VALIDATION_STATUS_KEY is ["servicesValidationStatus"]', () => {
    expect(REACT_QUERY_KEYS.SERVICES_VALIDATION_STATUS_KEY).toEqual([
      'servicesValidationStatus',
    ]);
  });

  it('ALL_SERVICE_DEPLOYMENTS_KEY is ["allServiceDeployments"]', () => {
    expect(REACT_QUERY_KEYS.ALL_SERVICE_DEPLOYMENTS_KEY).toEqual([
      'allServiceDeployments',
    ]);
  });

  it('WALLETS_KEY is ["wallets"]', () => {
    expect(REACT_QUERY_KEYS.WALLETS_KEY).toEqual(['wallets']);
  });

  it('AGENT_ACTIVITY is ["agentActivity"]', () => {
    expect(REACT_QUERY_KEYS.AGENT_ACTIVITY).toEqual(['agentActivity']);
  });

  it('IS_PEARL_OUTDATED_KEY is ["isPearlOutdated"]', () => {
    expect(REACT_QUERY_KEYS.IS_PEARL_OUTDATED_KEY).toEqual(['isPearlOutdated']);
  });

  it('LATEST_RELEASE_TAG_KEY is ["latestReleaseTag"]', () => {
    expect(REACT_QUERY_KEYS.LATEST_RELEASE_TAG_KEY).toEqual([
      'latestReleaseTag',
    ]);
  });

  it('SETTINGS_KEY is ["settings"]', () => {
    expect(REACT_QUERY_KEYS.SETTINGS_KEY).toEqual(['settings']);
  });

  it('EXTENDED_WALLET_KEY is ["extendedWallet"]', () => {
    expect(REACT_QUERY_KEYS.EXTENDED_WALLET_KEY).toEqual(['extendedWallet']);
  });

  it('RECOVERY_STATUS_KEY is ["recoveryStatus"]', () => {
    expect(REACT_QUERY_KEYS.RECOVERY_STATUS_KEY).toEqual(['recoveryStatus']);
  });

  it('RECOVERY_FUNDING_REQUIREMENTS_KEY is ["recoveryFundingRequirements"]', () => {
    expect(REACT_QUERY_KEYS.RECOVERY_FUNDING_REQUIREMENTS_KEY).toEqual([
      'recoveryFundingRequirements',
    ]);
  });
});

// ─── Factory keys ─────────────────────────────────────────────────────────────

describe('STAKING_CONTRACT_DETAILS_BY_STAKING_PROGRAM_KEY', () => {
  it('embeds chainId, serviceConfigId, and stakingProgramId in the key', () => {
    const key =
      REACT_QUERY_KEYS.STAKING_CONTRACT_DETAILS_BY_STAKING_PROGRAM_KEY(
        100,
        7,
        'pearl_beta_3',
      );
    expect(key[0]).toBe('stakingContractDetailsByStakingProgramId');
    expect(key[1]).toBe(100);
    expect(key[2]).toBe(7);
    expect(key[3]).toBe('pearl_beta_3');
  });

  it('keys differ when chainId differs', () => {
    const gnosisKey =
      REACT_QUERY_KEYS.STAKING_CONTRACT_DETAILS_BY_STAKING_PROGRAM_KEY(
        100,
        7,
        'pearl_beta_3',
      );
    const baseKey =
      REACT_QUERY_KEYS.STAKING_CONTRACT_DETAILS_BY_STAKING_PROGRAM_KEY(
        8453,
        7,
        'pearl_beta_3',
      );
    expect(gnosisKey).not.toEqual(baseKey);
  });
});

describe('ALL_STAKING_CONTRACT_DETAILS', () => {
  it('embeds chainId and stakingProgramId in the key', () => {
    const key = REACT_QUERY_KEYS.ALL_STAKING_CONTRACT_DETAILS(
      100,
      'pearl_alpha',
    );
    expect(key[0]).toBe('allStakingContractDetails');
    expect(key[1]).toBe(100);
    expect(key[2]).toBe('pearl_alpha');
  });
});

describe('STAKING_PROGRAM_KEY', () => {
  it('embeds chainId and serviceConfigId in the key', () => {
    const key = REACT_QUERY_KEYS.STAKING_PROGRAM_KEY(100, 3);
    expect(key[0]).toBe('stakingProgram');
    expect(key[1]).toBe(100);
    expect(key[2]).toBe(3);
  });

  it('defaults serviceConfigId to 0 when omitted', () => {
    const key = REACT_QUERY_KEYS.STAKING_PROGRAM_KEY(100);
    expect(key[2]).toBe(0);
  });
});

describe('LATEST_EPOCH_TIME_KEY', () => {
  it('embeds chainId and stakingProgramId in the key', () => {
    const key = REACT_QUERY_KEYS.LATEST_EPOCH_TIME_KEY(100, 'pearl_beta_6');
    expect(key[0]).toBe('latestEpochTime');
    expect(key[1]).toBe(100);
    expect(key[2]).toBe('pearl_beta_6');
  });
});

describe('REWARDS_KEY', () => {
  it('embeds all five arguments in the key', () => {
    const multisig = '0xSafe';
    const key = REACT_QUERY_KEYS.REWARDS_KEY(
      100,
      'svc-1',
      'pearl_beta_3',
      multisig,
      20,
    );
    expect(key[0]).toBe('rewards');
    expect(key[1]).toBe(100);
    expect(key[2]).toBe('svc-1');
    expect(key[3]).toBe('pearl_beta_3');
    expect(key[4]).toBe(multisig);
    expect(key[5]).toBe(20);
  });
});

describe('AVAILABLE_REWARDS_FOR_EPOCH_KEY', () => {
  it('embeds chainId, serviceConfigId, and stakingProgramId', () => {
    const key = REACT_QUERY_KEYS.AVAILABLE_REWARDS_FOR_EPOCH_KEY(
      100,
      'svc-1',
      'pearl_beta_3',
    );
    expect(key[0]).toBe('availableRewardsForEpoch');
    expect(key[1]).toBe(100);
    expect(key[2]).toBe('svc-1');
    expect(key[3]).toBe('pearl_beta_3');
  });
});

describe('REWARDS_HISTORY_KEY', () => {
  it('embeds chainId and serviceId', () => {
    const key = REACT_QUERY_KEYS.REWARDS_HISTORY_KEY(100, 42);
    expect(key[0]).toBe('rewardsHistory');
    expect(key[1]).toBe(100);
    expect(key[2]).toBe(42);
  });
});

describe('MULTISIG_GET_OWNERS_KEY', () => {
  it('embeds the multisig evmChainId and address', () => {
    const multisig = { evmChainId: 100, address: '0xSafe' } as never;
    const key = REACT_QUERY_KEYS.MULTISIG_GET_OWNERS_KEY(multisig);
    expect(key[0]).toBe('multisig');
    expect(key[1]).toBe('getOwners');
    expect(key[2]).toBe(100);
    expect(key[3]).toBe('0xSafe');
  });
});

describe('MULTISIGS_GET_OWNERS_KEY', () => {
  it('embeds all multisig addresses in the key', () => {
    const multisigs = [
      { evmChainId: 100, address: '0xSafe1' },
      { evmChainId: 8453, address: '0xSafe2' },
    ] as never;
    const key = REACT_QUERY_KEYS.MULTISIGS_GET_OWNERS_KEY(multisigs);
    expect(key[0]).toBe('multisigs');
    expect(key[1]).toBe('getOwners');
    expect(key[2]).toEqual(['0xSafe1', '0xSafe2']);
  });

  it('keys differ when the set of multisig addresses differs', () => {
    const key1 = REACT_QUERY_KEYS.MULTISIGS_GET_OWNERS_KEY([
      { evmChainId: 100, address: '0xSafe1' },
    ] as never);
    const key2 = REACT_QUERY_KEYS.MULTISIGS_GET_OWNERS_KEY([
      { evmChainId: 100, address: '0xSafe2' },
    ] as never);
    expect(key1).not.toEqual(key2);
  });
});

describe('AGENT_PERFORMANCE_KEY', () => {
  it('embeds chainId and serviceConfigId', () => {
    const key = REACT_QUERY_KEYS.AGENT_PERFORMANCE_KEY(8453, 'svc-1');
    expect(key[0]).toBe('agentPerformance');
    expect(key[1]).toBe(8453);
    expect(key[2]).toBe('svc-1');
  });
});

describe('BALANCES_AND_REFILL_REQUIREMENTS_KEY', () => {
  it('embeds the serviceConfigId', () => {
    const key = REACT_QUERY_KEYS.BALANCES_AND_REFILL_REQUIREMENTS_KEY('svc-1');
    expect(key[0]).toBe('balancesAndRefillRequirements');
    expect(key[1]).toBe('svc-1');
  });
});

describe('ALL_BALANCES_AND_REFILL_REQUIREMENTS_KEY', () => {
  it('spreads all serviceConfigIds into the key', () => {
    const key = REACT_QUERY_KEYS.ALL_BALANCES_AND_REFILL_REQUIREMENTS_KEY([
      'svc-1',
      'svc-2',
    ]);
    expect(key[0]).toBe('allChainBalancesAndRefillRequirements');
    expect(key[1]).toBe('svc-1');
    expect(key[2]).toBe('svc-2');
  });
});

describe('BRIDGE_REFILL_REQUIREMENTS_KEY', () => {
  const params = {
    chain: 'base',
    serviceConfigId: 'svc-1',
  } as never;

  it('embeds params and default type="default"', () => {
    const key = REACT_QUERY_KEYS.BRIDGE_REFILL_REQUIREMENTS_KEY(params);
    expect(key[0]).toBe('bridgeRefillRequirements');
    expect(key[1]).toBe(params);
    expect(key[2]).toBe('default');
  });

  it('embeds a custom type when provided', () => {
    const key = REACT_QUERY_KEYS.BRIDGE_REFILL_REQUIREMENTS_KEY(
      params,
      'on-demand',
    );
    expect(key[2]).toBe('on-demand');
  });

  it('keys differ between different type values', () => {
    const k1 = REACT_QUERY_KEYS.BRIDGE_REFILL_REQUIREMENTS_KEY(
      params,
      'default',
    );
    const k2 = REACT_QUERY_KEYS.BRIDGE_REFILL_REQUIREMENTS_KEY(
      params,
      'on-demand',
    );
    expect(k1).not.toEqual(k2);
  });
});

describe('BRIDGE_REFILL_REQUIREMENTS_KEY_ON_DEMAND', () => {
  it('embeds params in the key', () => {
    const params = { chain: 'optimism' } as never;
    const key =
      REACT_QUERY_KEYS.BRIDGE_REFILL_REQUIREMENTS_KEY_ON_DEMAND(params);
    expect(key[0]).toBe('useBridgeRefillRequirementsOnDemand');
    expect(key[1]).toBe(params);
  });
});

describe('BRIDGE_STATUS_BY_QUOTE_ID_KEY', () => {
  it('embeds quoteId in the key', () => {
    const key = REACT_QUERY_KEYS.BRIDGE_STATUS_BY_QUOTE_ID_KEY('quote-abc-123');
    expect(key[0]).toBe('bridgeStatusByQuoteId');
    expect(key[1]).toBe('quote-abc-123');
  });
});

describe('BRIDGE_EXECUTE_KEY', () => {
  it('embeds quoteId in the key', () => {
    const key = REACT_QUERY_KEYS.BRIDGE_EXECUTE_KEY('quote-xyz-456');
    expect(key[0]).toBe('bridgeExecute');
    expect(key[1]).toBe('quote-xyz-456');
  });
});

describe('ON_RAMP_QUOTE_KEY', () => {
  it('embeds chain and amount in the key', () => {
    const key = REACT_QUERY_KEYS.ON_RAMP_QUOTE_KEY('base' as never, 100);
    expect(key[0]).toBe('onRampQuote');
    expect(key[1]).toBe('base');
    expect(key[2]).toBe(100);
  });

  it('accepts a string amount', () => {
    const key = REACT_QUERY_KEYS.ON_RAMP_QUOTE_KEY('optimism' as never, '50.5');
    expect(key[2]).toBe('50.5');
  });
});

describe('GEO_ELIGIBILITY_KEY', () => {
  it('embeds the agentType when provided', () => {
    const key = REACT_QUERY_KEYS.GEO_ELIGIBILITY_KEY('trader' as never);
    expect(key[0]).toBe('geoEligibility');
    expect(key[1]).toBe('trader');
  });

  it('uses undefined as agentType when not provided', () => {
    const key = REACT_QUERY_KEYS.GEO_ELIGIBILITY_KEY();
    expect(key[0]).toBe('geoEligibility');
    expect(key[1]).toBeUndefined();
  });
});

describe('ACHIEVEMENTS_KEY', () => {
  it('embeds the serviceConfigId when provided', () => {
    const key = REACT_QUERY_KEYS.ACHIEVEMENTS_KEY('svc-1');
    expect(key[0]).toBe('achievements');
    expect(key[1]).toBe('svc-1');
  });

  it('embeds null when serviceConfigId is null', () => {
    const key = REACT_QUERY_KEYS.ACHIEVEMENTS_KEY(null);
    expect(key[1]).toBeNull();
  });
});

// ─── Key uniqueness across the map ────────────────────────────────────────────

describe('key discriminator uniqueness', () => {
  it('all static keys have a unique first element', () => {
    // Static keys are arrays — their [0] element must not collide with one another.
    const staticKeys = [
      REACT_QUERY_KEYS.SERVICES_KEY,
      REACT_QUERY_KEYS.SERVICES_VALIDATION_STATUS_KEY,
      REACT_QUERY_KEYS.ALL_SERVICE_DEPLOYMENTS_KEY,
      REACT_QUERY_KEYS.WALLETS_KEY,
      REACT_QUERY_KEYS.AGENT_ACTIVITY,
      REACT_QUERY_KEYS.IS_PEARL_OUTDATED_KEY,
      REACT_QUERY_KEYS.LATEST_RELEASE_TAG_KEY,
      REACT_QUERY_KEYS.SETTINGS_KEY,
      REACT_QUERY_KEYS.EXTENDED_WALLET_KEY,
      REACT_QUERY_KEYS.RECOVERY_STATUS_KEY,
      REACT_QUERY_KEYS.RECOVERY_FUNDING_REQUIREMENTS_KEY,
    ];
    const discriminators = staticKeys.map((k) => k[0]);
    const unique = new Set(discriminators);
    expect(unique.size).toBe(discriminators.length);
  });
});
