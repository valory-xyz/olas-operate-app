/**
 * Tests for Mode chain staking program configuration.
 *
 * Mode programs primarily support the Modius agent. OptimusAlpha is a
 * legacy program on Mode that also supports Modius (despite its name),
 * while the dedicated Optimus programs are on Optimism chain.
 */

import { MODE_STAKING_PROGRAMS } from '../../../config/stakingPrograms/mode';
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

describe('MODE_STAKING_PROGRAMS', () => {
  it('covers all 5 Mode staking program IDs', () => {
    const expectedIds = [
      STAKING_PROGRAM_IDS.ModiusAlpha,
      STAKING_PROGRAM_IDS.ModiusAlpha2,
      STAKING_PROGRAM_IDS.ModiusAlpha3,
      STAKING_PROGRAM_IDS.ModiusAlpha4,
      STAKING_PROGRAM_IDS.OptimusAlpha,
    ];
    for (const id of expectedIds) {
      expect(MODE_STAKING_PROGRAMS[id]).toBeDefined();
    }
    expect(Object.keys(MODE_STAKING_PROGRAMS)).toHaveLength(5);
  });

  it('all programs are on Mode chain (chainId 34443)', () => {
    for (const program of Object.values(MODE_STAKING_PROGRAMS)) {
      expect(program.chainId).toBe(EvmChainIdMap.Mode);
    }
  });

  it('all Modius Alpha programs support the Modius agent', () => {
    const modiusIds = [
      STAKING_PROGRAM_IDS.ModiusAlpha,
      STAKING_PROGRAM_IDS.ModiusAlpha2,
      STAKING_PROGRAM_IDS.ModiusAlpha3,
      STAKING_PROGRAM_IDS.ModiusAlpha4,
    ];
    for (const id of modiusIds) {
      expect(MODE_STAKING_PROGRAMS[id].agentsSupported).toContain(
        AgentMap.Modius,
      );
    }
  });

  it('OptimusAlpha on Mode supports Modius agent (not Optimus — dedicated Optimus programs are on Optimism)', () => {
    // This is intentional: OptimusAlpha on Mode is a legacy program
    // that was repurposed for Modius.
    const program = MODE_STAKING_PROGRAMS[STAKING_PROGRAM_IDS.OptimusAlpha];
    expect(program.agentsSupported).toContain(AgentMap.Modius);
    expect(program.agentsSupported).not.toContain(AgentMap.Optimus);
  });

  it('all programs have a valid Ethereum contract address', () => {
    for (const program of Object.values(MODE_STAKING_PROGRAMS)) {
      expect(program.address).toMatch(EVM_ADDRESS_PATTERN);
    }
  });

  it('no two programs share the same contract address', () => {
    const addresses = Object.values(MODE_STAKING_PROGRAMS).map(
      (p) => p.address,
    );
    const unique = new Set(addresses);
    expect(unique.size).toBe(addresses.length);
  });

  it('all programs have a positive OLAS staking requirement', () => {
    for (const program of Object.values(MODE_STAKING_PROGRAMS)) {
      expect(program.stakingRequirements['OLAS']).toBeGreaterThan(0);
    }
  });

  it('all programs have an activityChecker', () => {
    for (const program of Object.values(MODE_STAKING_PROGRAMS)) {
      expect(program.activityChecker).toBeDefined();
    }
  });

  it('ModiusAlpha4 requires 5000 OLAS (premium tier)', () => {
    expect(
      MODE_STAKING_PROGRAMS[STAKING_PROGRAM_IDS.ModiusAlpha4]
        .stakingRequirements['OLAS'],
    ).toBe(5000);
  });

  it('ModiusAlpha requires 40 OLAS (entry tier)', () => {
    expect(
      MODE_STAKING_PROGRAMS[STAKING_PROGRAM_IDS.ModiusAlpha]
        .stakingRequirements['OLAS'],
    ).toBe(40);
  });

  it('no Mode programs are marked deprecated', () => {
    // All Mode programs are currently active
    for (const program of Object.values(MODE_STAKING_PROGRAMS)) {
      expect(program.deprecated).toBeUndefined();
    }
  });
});
