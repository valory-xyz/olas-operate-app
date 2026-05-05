/**
 * Tests for Base chain staking program configuration.
 *
 * Base programs serve two distinct agent types: AgentsFun (meme-coin traders)
 * and PettAi (pet AI). It's critical that each program only lists the correct
 * `agentsSupported` so the UI shows the program to the right users.
 */

import { BASE_STAKING_PROGRAMS } from '../../../config/stakingPrograms/base';
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

describe('BASE_STAKING_PROGRAMS', () => {
  it('covers all 11 Base staking program IDs', () => {
    const expectedIds = [
      STAKING_PROGRAM_IDS.MemeBaseAlpha2,
      STAKING_PROGRAM_IDS.MemeBaseBeta,
      STAKING_PROGRAM_IDS.MemeBaseBeta2,
      STAKING_PROGRAM_IDS.MemeBaseBeta3,
      STAKING_PROGRAM_IDS.AgentsFun1,
      STAKING_PROGRAM_IDS.AgentsFun2,
      STAKING_PROGRAM_IDS.AgentsFun3,
      STAKING_PROGRAM_IDS.PettAiAgent,
      STAKING_PROGRAM_IDS.PettAiAgent2,
      STAKING_PROGRAM_IDS.PettAiAgent3,
      STAKING_PROGRAM_IDS.PettAiAgent4,
    ];
    for (const id of expectedIds) {
      expect(BASE_STAKING_PROGRAMS[id]).toBeDefined();
    }
    expect(Object.keys(BASE_STAKING_PROGRAMS)).toHaveLength(11);
  });

  it('all programs are on Base chain (chainId 8453)', () => {
    for (const program of Object.values(BASE_STAKING_PROGRAMS)) {
      expect(program.chainId).toBe(EvmChainIdMap.Base);
    }
  });

  it('all programs have a valid Ethereum contract address', () => {
    for (const program of Object.values(BASE_STAKING_PROGRAMS)) {
      expect(program.address).toMatch(EVM_ADDRESS_PATTERN);
    }
  });

  it('no two programs share the same contract address', () => {
    const addresses = Object.values(BASE_STAKING_PROGRAMS).map(
      (p) => p.address,
    );
    const unique = new Set(addresses);
    expect(unique.size).toBe(addresses.length);
  });

  it('all programs have an activityChecker', () => {
    for (const program of Object.values(BASE_STAKING_PROGRAMS)) {
      expect(program.activityChecker).toBeDefined();
    }
  });

  describe('AgentsFun programs', () => {
    const agentsFunIds = [
      STAKING_PROGRAM_IDS.MemeBaseAlpha2,
      STAKING_PROGRAM_IDS.MemeBaseBeta,
      STAKING_PROGRAM_IDS.MemeBaseBeta2,
      STAKING_PROGRAM_IDS.MemeBaseBeta3,
      STAKING_PROGRAM_IDS.AgentsFun1,
      STAKING_PROGRAM_IDS.AgentsFun2,
      STAKING_PROGRAM_IDS.AgentsFun3,
    ];

    it('support only AgentsFun (meme coin trader)', () => {
      for (const id of agentsFunIds) {
        expect(BASE_STAKING_PROGRAMS[id].agentsSupported).toContain(
          AgentMap.AgentsFun,
        );
        expect(BASE_STAKING_PROGRAMS[id].agentsSupported).not.toContain(
          AgentMap.PettAi,
        );
      }
    });

    it('MemeBase programs are all deprecated', () => {
      const memeBaseIds = [
        STAKING_PROGRAM_IDS.MemeBaseAlpha2,
        STAKING_PROGRAM_IDS.MemeBaseBeta,
        STAKING_PROGRAM_IDS.MemeBaseBeta2,
        STAKING_PROGRAM_IDS.MemeBaseBeta3,
      ];
      for (const id of memeBaseIds) {
        expect(BASE_STAKING_PROGRAMS[id].deprecated).toBe(true);
      }
    });

    it('AgentsFun1/2/3 are the active non-deprecated programs', () => {
      const activeAgentsFunIds = [
        STAKING_PROGRAM_IDS.AgentsFun1,
        STAKING_PROGRAM_IDS.AgentsFun2,
        STAKING_PROGRAM_IDS.AgentsFun3,
      ];
      for (const id of activeAgentsFunIds) {
        // These should not be deprecated (they are the current programs)
        expect(BASE_STAKING_PROGRAMS[id].deprecated).toBeUndefined();
      }
    });
  });

  describe('PettAi programs', () => {
    const pettAiIds = [
      STAKING_PROGRAM_IDS.PettAiAgent,
      STAKING_PROGRAM_IDS.PettAiAgent2,
      STAKING_PROGRAM_IDS.PettAiAgent3,
      STAKING_PROGRAM_IDS.PettAiAgent4,
    ];

    it('support only PettAi agent', () => {
      for (const id of pettAiIds) {
        expect(BASE_STAKING_PROGRAMS[id].agentsSupported).toContain(
          AgentMap.PettAi,
        );
        expect(BASE_STAKING_PROGRAMS[id].agentsSupported).not.toContain(
          AgentMap.AgentsFun,
        );
      }
    });

    it('PettAiAgent and PettAiAgent2 are deprecated', () => {
      expect(
        BASE_STAKING_PROGRAMS[STAKING_PROGRAM_IDS.PettAiAgent].deprecated,
      ).toBe(true);
      expect(
        BASE_STAKING_PROGRAMS[STAKING_PROGRAM_IDS.PettAiAgent2].deprecated,
      ).toBe(true);
    });

    it('PettAiAgent3 and PettAiAgent4 are active (not deprecated)', () => {
      expect(
        BASE_STAKING_PROGRAMS[STAKING_PROGRAM_IDS.PettAiAgent3].deprecated,
      ).toBeUndefined();
      expect(
        BASE_STAKING_PROGRAMS[STAKING_PROGRAM_IDS.PettAiAgent4].deprecated,
      ).toBeUndefined();
    });
  });

  describe('staking requirements', () => {
    it('all programs require a positive amount of OLAS', () => {
      for (const program of Object.values(BASE_STAKING_PROGRAMS)) {
        expect(program.stakingRequirements['OLAS']).toBeGreaterThan(0);
      }
    });

    it('MemeBaseBeta3 requires 5000 OLAS (premium tier)', () => {
      expect(
        BASE_STAKING_PROGRAMS[STAKING_PROGRAM_IDS.MemeBaseBeta3]
          .stakingRequirements['OLAS'],
      ).toBe(5000);
    });

    it('MemeBaseAlpha2 requires 100 OLAS (entry tier)', () => {
      expect(
        BASE_STAKING_PROGRAMS[STAKING_PROGRAM_IDS.MemeBaseAlpha2]
          .stakingRequirements['OLAS'],
      ).toBe(100);
    });
  });
});
