/**
 * Tests for Gnosis staking program configuration.
 *
 * Each program entry is used to populate staking program selectors and to
 * determine eligibility for each agent. Critical properties:
 * - `agentsSupported` determines which agent types can use the program
 * - `stakingRequirements.OLAS` is the minimum bond required
 * - `deprecated` marks programs users should migrate away from
 * - `address` is the on-chain staking contract address
 */

import { GNOSIS_STAKING_PROGRAMS } from '../../../config/stakingPrograms/gnosis';
import { AgentMap } from '../../../constants/agent';
import { EvmChainIdMap } from '../../../constants/chains';
import { STAKING_PROGRAM_IDS } from '../../../constants/stakingProgram';

jest.mock(
  'ethers-multicall',
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../mocks/ethersMulticall').ethersMulticallMock,
);

const EVM_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

describe('GNOSIS_STAKING_PROGRAMS', () => {
  it('covers all 12 Gnosis staking program IDs', () => {
    const expectedIds = [
      STAKING_PROGRAM_IDS.PearlAlpha,
      STAKING_PROGRAM_IDS.PearlBeta,
      STAKING_PROGRAM_IDS.PearlBeta2,
      STAKING_PROGRAM_IDS.PearlBeta3,
      STAKING_PROGRAM_IDS.PearlBeta4,
      STAKING_PROGRAM_IDS.PearlBeta5,
      STAKING_PROGRAM_IDS.PearlBeta6,
      STAKING_PROGRAM_IDS.PearlBetaMechMarketplace,
      STAKING_PROGRAM_IDS.PearlBetaMechMarketplace1,
      STAKING_PROGRAM_IDS.PearlBetaMechMarketplace2,
      STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3,
      STAKING_PROGRAM_IDS.PearlBetaMechMarketplace4,
    ];
    for (const id of expectedIds) {
      expect(GNOSIS_STAKING_PROGRAMS[id]).toBeDefined();
    }
    expect(Object.keys(GNOSIS_STAKING_PROGRAMS)).toHaveLength(12);
  });

  it('all programs are on Gnosis chain (chainId 100)', () => {
    for (const program of Object.values(GNOSIS_STAKING_PROGRAMS)) {
      expect(program.chainId).toBe(EvmChainIdMap.Gnosis);
    }
  });

  it('all programs support the PredictTrader agent', () => {
    for (const program of Object.values(GNOSIS_STAKING_PROGRAMS)) {
      expect(program.agentsSupported).toContain(AgentMap.PredictTrader);
    }
  });

  it('all programs have a non-empty name string', () => {
    for (const program of Object.values(GNOSIS_STAKING_PROGRAMS)) {
      expect(typeof program.name).toBe('string');
      expect(program.name.length).toBeGreaterThan(0);
    }
  });

  it('all programs have a valid Ethereum contract address', () => {
    for (const program of Object.values(GNOSIS_STAKING_PROGRAMS)) {
      expect(program.address).toMatch(EVM_ADDRESS_PATTERN);
    }
  });

  it('all programs have a positive OLAS staking requirement', () => {
    for (const program of Object.values(GNOSIS_STAKING_PROGRAMS)) {
      const olasRequired = program.stakingRequirements['OLAS'];
      expect(olasRequired).toBeGreaterThan(0);
    }
  });

  it('all programs have a contract object', () => {
    for (const program of Object.values(GNOSIS_STAKING_PROGRAMS)) {
      expect(program.contract).toBeDefined();
    }
  });

  it('all programs have an activityChecker', () => {
    for (const program of Object.values(GNOSIS_STAKING_PROGRAMS)) {
      expect(program.activityChecker).toBeDefined();
    }
  });

  it('no two programs share the same contract address', () => {
    const addresses = Object.values(GNOSIS_STAKING_PROGRAMS).map(
      (p) => p.address,
    );
    const unique = new Set(addresses);
    expect(unique.size).toBe(addresses.length);
  });

  describe('deprecated programs', () => {
    it('PearlAlpha through PearlBeta6 are marked deprecated', () => {
      const deprecatedKeys = [
        STAKING_PROGRAM_IDS.PearlAlpha,
        STAKING_PROGRAM_IDS.PearlBeta,
        STAKING_PROGRAM_IDS.PearlBeta2,
        STAKING_PROGRAM_IDS.PearlBeta3,
        STAKING_PROGRAM_IDS.PearlBeta4,
        STAKING_PROGRAM_IDS.PearlBeta5,
        STAKING_PROGRAM_IDS.PearlBeta6,
        STAKING_PROGRAM_IDS.PearlBetaMechMarketplace,
      ];
      for (const id of deprecatedKeys) {
        expect(GNOSIS_STAKING_PROGRAMS[id].deprecated).toBe(true);
      }
    });

    it('PearlBetaMechMarketplace1 through 4 include active (non-deprecated) programs', () => {
      // These are the current generation programs users should migrate to
      const activeKeys = [
        STAKING_PROGRAM_IDS.PearlBetaMechMarketplace1,
        STAKING_PROGRAM_IDS.PearlBetaMechMarketplace2,
        STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3,
        STAKING_PROGRAM_IDS.PearlBetaMechMarketplace4,
      ];
      // At least one should NOT be deprecated
      const hasNonDeprecated = activeKeys.some(
        (id) => !GNOSIS_STAKING_PROGRAMS[id].deprecated,
      );
      expect(hasNonDeprecated).toBe(true);
    });
  });

  describe('specific program requirements', () => {
    it('PearlAlpha requires 20 OLAS (smallest requirement, earliest program)', () => {
      const program = GNOSIS_STAKING_PROGRAMS[STAKING_PROGRAM_IDS.PearlAlpha];
      expect(program.stakingRequirements['OLAS']).toBe(20);
    });

    it('PearlBeta6 requires 5000 OLAS (premium tier)', () => {
      const program = GNOSIS_STAKING_PROGRAMS[STAKING_PROGRAM_IDS.PearlBeta6];
      expect(program.stakingRequirements['OLAS']).toBe(5000);
    });

    it('PearlBetaMechMarketplace4 has a non-empty name', () => {
      const program =
        GNOSIS_STAKING_PROGRAMS[STAKING_PROGRAM_IDS.PearlBetaMechMarketplace4];
      expect(program.name).toBe('Pearl Beta Mech Marketplace IV');
    });

    it('PearlAlpha address is 0xEE9F19b5DF06c7E8Bfc7B28745dcf944C504198A', () => {
      expect(
        GNOSIS_STAKING_PROGRAMS[STAKING_PROGRAM_IDS.PearlAlpha].address,
      ).toBe('0xEE9F19b5DF06c7E8Bfc7B28745dcf944C504198A');
    });
  });
});
