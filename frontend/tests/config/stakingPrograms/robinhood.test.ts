/**
 * Tests for Robinhood Chain staking program configuration: Connect's three
 * optional-staking contracts. Ids must match the middleware's `STAKING` table.
 */

import { STAKING_PROGRAMS } from '../../../config/stakingPrograms';
import { ROBINHOOD_STAKING_PROGRAMS } from '../../../config/stakingPrograms/robinhood';
import { AgentMap } from '../../../constants/agent';
import { EvmChainIdMap } from '../../../constants/chains';
import { STAKING_PROGRAM_IDS } from '../../../constants/stakingProgram';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

describe('ROBINHOOD_STAKING_PROGRAMS', () => {
  it('is the Robinhood entry of STAKING_PROGRAMS', () => {
    expect(STAKING_PROGRAMS[EvmChainIdMap.Robinhood]).toBe(
      ROBINHOOD_STAKING_PROGRAMS,
    );
  });

  it.each([
    [
      STAKING_PROGRAM_IDS.ConnectRobinhoodI,
      'connect_i',
      'Connect I',
      '0x228DC61b838D6eD82347a93aA2cd3e28544808Ea',
      100,
    ],
    [
      STAKING_PROGRAM_IDS.ConnectRobinhoodII,
      'connect_ii',
      'Connect II',
      '0x009Cda4D71c56Db6A1bac850483DB8E01D32884E',
      5000,
    ],
    [
      STAKING_PROGRAM_IDS.ConnectRobinhoodIII,
      'connect_iii',
      'Connect III',
      '0x7Bb72fa48b274672Cb6A362045cdCf470aEe99b2',
      10000,
    ],
  ])(
    'pins %s (id %s) to its contract and OLAS requirement',
    (programId, middlewareId, name, address, olas) => {
      expect(programId).toBe(middlewareId);
      const program = ROBINHOOD_STAKING_PROGRAMS[programId];
      expect(program).toMatchObject({
        chainId: EvmChainIdMap.Robinhood,
        name,
        address,
        agentsSupported: [AgentMap.Connect],
        stakingRequirements: { OLAS: olas },
        stakingVersion: '0.4',
      });
      expect(program.id).toBe(
        `0x${address.toLowerCase().slice(2).padStart(64, '0')}`,
      );
    },
  );

  it('holds only the three Connect programs', () => {
    expect(Object.keys(ROBINHOOD_STAKING_PROGRAMS)).toEqual([
      'connect_i',
      'connect_ii',
      'connect_iii',
    ]);
  });
});
