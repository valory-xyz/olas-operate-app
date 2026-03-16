/**
 * Tests for Optimism chain staking program configuration.
 *
 * These are the dedicated Optimus agent staking programs. Unlike OptimusAlpha
 * (which lives on Mode and supports Modius), OptimusAlpha2/3/4 on Optimism
 * are the intended programs for the Optimus agent.
 *
 * Note: OptimusAlpha1 on Optimism was deprecated and intentionally omitted.
 */

import { OPTIMISM_STAKING_PROGRAMS } from '../../../config/stakingPrograms/optimism';
import { AgentMap } from '../../../constants/agent';
import { EvmChainIdMap } from '../../../constants/chains';
import { OPTIMISM_STAKING_PROGRAM_IDS } from '../../../constants/stakingProgram';

jest.mock(
  'ethers-multicall',
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../mocks/ethersMulticall').ethersMulticallMock,
);

const EVM_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

describe('OPTIMISM_STAKING_PROGRAMS', () => {
  it('covers all 3 Optimism staking program IDs (OptimusAlpha2/3/4)', () => {
    const expectedIds = [
      OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha2,
      OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha3,
      OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha4,
    ];
    for (const id of expectedIds) {
      expect(OPTIMISM_STAKING_PROGRAMS[id]).toBeDefined();
    }
    expect(Object.keys(OPTIMISM_STAKING_PROGRAMS)).toHaveLength(3);
  });

  it('all programs are on Optimism chain (chainId 10)', () => {
    for (const program of Object.values(OPTIMISM_STAKING_PROGRAMS)) {
      expect(program.chainId).toBe(EvmChainIdMap.Optimism);
    }
  });

  it('all programs support the Optimus agent', () => {
    for (const program of Object.values(OPTIMISM_STAKING_PROGRAMS)) {
      expect(program.agentsSupported).toContain(AgentMap.Optimus);
    }
  });

  it('all programs have a valid Ethereum contract address', () => {
    for (const program of Object.values(OPTIMISM_STAKING_PROGRAMS)) {
      expect(program.address).toMatch(EVM_ADDRESS_PATTERN);
    }
  });

  it('no two programs share the same contract address', () => {
    const addresses = Object.values(OPTIMISM_STAKING_PROGRAMS).map(
      (p) => p.address,
    );
    const unique = new Set(addresses);
    expect(unique.size).toBe(addresses.length);
  });

  it('all programs have a positive OLAS staking requirement', () => {
    for (const program of Object.values(OPTIMISM_STAKING_PROGRAMS)) {
      expect(program.stakingRequirements['OLAS']).toBeGreaterThan(0);
    }
  });

  it('all programs have an activityChecker', () => {
    for (const program of Object.values(OPTIMISM_STAKING_PROGRAMS)) {
      expect(program.activityChecker).toBeDefined();
    }
  });

  it('no Optimism programs are deprecated (all active)', () => {
    for (const program of Object.values(OPTIMISM_STAKING_PROGRAMS)) {
      expect(program.deprecated).toBeUndefined();
    }
  });

  describe('staking tier requirements', () => {
    it('OptimusAlpha2 requires 100 OLAS (entry tier)', () => {
      expect(
        OPTIMISM_STAKING_PROGRAMS[OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha2]
          .stakingRequirements['OLAS'],
      ).toBe(100);
    });

    it('OptimusAlpha3 requires 1000 OLAS (mid tier)', () => {
      expect(
        OPTIMISM_STAKING_PROGRAMS[OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha3]
          .stakingRequirements['OLAS'],
      ).toBe(1000);
    });

    it('OptimusAlpha4 requires 5000 OLAS (premium tier)', () => {
      expect(
        OPTIMISM_STAKING_PROGRAMS[OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha4]
          .stakingRequirements['OLAS'],
      ).toBe(5000);
    });
  });

  describe('specific contract addresses', () => {
    it('OptimusAlpha2 address is 0xBCA056952D2A7a8dD4A002079219807CFDF9fd29', () => {
      expect(
        OPTIMISM_STAKING_PROGRAMS[OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha2]
          .address,
      ).toBe('0xBCA056952D2A7a8dD4A002079219807CFDF9fd29');
    });
  });
});
