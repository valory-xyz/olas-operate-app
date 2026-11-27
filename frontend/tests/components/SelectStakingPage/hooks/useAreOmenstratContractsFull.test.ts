import { renderHook } from '@testing-library/react';

import {
  getOmenstratProgramIds,
  useAreOmenstratContractsFull,
} from '../../../../components/SelectStakingPage/hooks/useAreOmenstratContractsFull';
import { STAKING_PROGRAMS } from '../../../../config/stakingPrograms';
import { AgentMap } from '../../../../constants/agent';
import { EvmChainIdMap } from '../../../../constants/chains';
import { STAKING_PROGRAM_IDS } from '../../../../constants/stakingProgram';
import { useServices, useStakingContractContext } from '../../../../hooks';

jest.mock('../../../../hooks', () => ({
  useServices: jest.fn(),
  useStakingContractContext: jest.fn(),
}));

// What Gnosis offers new PredictTraders; update when the offered Omenstrat
// contracts change.
const OMENSTRAT_IDS = [
  STAKING_PROGRAM_IDS.OmenstratVIII,
  STAKING_PROGRAM_IDS.OmenstratIX,
  STAKING_PROGRAM_IDS.OmenstratX,
];

const full = { maxNumServices: 2, serviceIds: [1, 2] };
const withSlot = { maxNumServices: 2, serviceIds: [1] };

const setup = (
  record: Record<string, unknown> | undefined,
  selectedAgentType: string = AgentMap.PredictTrader,
) => {
  (useServices as jest.Mock).mockReturnValue({ selectedAgentType });
  (useStakingContractContext as jest.Mock).mockReturnValue({
    allStakingContractDetailsRecord: record,
  });
  return renderHook(() => useAreOmenstratContractsFull()).result.current;
};

const allOmenstrat = (details: object) =>
  Object.fromEntries(OMENSTRAT_IDS.map((id) => [id, details]));

describe('useAreOmenstratContractsFull', () => {
  it('is true when every new Omenstrat contract is full', () => {
    expect(setup(allOmenstrat(full))).toBe(true);
  });

  it.each(OMENSTRAT_IDS)('is false while %s has a free slot', (programId) => {
    expect(setup({ ...allOmenstrat(full), [programId]: withSlot })).toBe(false);
  });

  it('is false while any one of them has not loaded', () => {
    const record = allOmenstrat(full);
    delete record[STAKING_PROGRAM_IDS.OmenstratIX];
    expect(setup(record)).toBe(false);
    expect(setup(undefined)).toBe(false);
  });

  it('is false when config offers no Omenstrat contract at all', () => {
    // [].every(...) is true: without the guard everyone would be sent to Connect.
    // The list is read once, at import, so load the hook against empty config.
    jest.isolateModules(() => {
      jest.doMock('../../../../config/stakingPrograms', () => ({
        ...jest.requireActual('../../../../config/stakingPrograms'),
        STAKING_PROGRAMS: { [EvmChainIdMap.Gnosis]: {} },
      }));
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const isolated = require('../../../../components/SelectStakingPage/hooks/useAreOmenstratContractsFull');
      (useServices as jest.Mock).mockReturnValue({
        selectedAgentType: AgentMap.PredictTrader,
      });
      (useStakingContractContext as jest.Mock).mockReturnValue({
        allStakingContractDetailsRecord: {},
      });
      expect(isolated.useAreOmenstratContractsFull()).toBe(false);
    });
  });

  it("is false on any other agent's list", () => {
    expect(setup(allOmenstrat(full), AgentMap.Connect)).toBe(false);
  });
});

describe('getOmenstratProgramIds', () => {
  it('picks the Omenstrat contracts Gnosis offers today', () => {
    expect(
      getOmenstratProgramIds(STAKING_PROGRAMS[EvmChainIdMap.Gnosis]),
    ).toEqual(OMENSTRAT_IDS);
  });

  it('keeps only offered PredictTrader contracts with an activity target', () => {
    const program = (over: object) => ({
      agentsSupported: [AgentMap.PredictTrader],
      activityTarget: 1,
      ...over,
    });
    const programs = {
      kept: program({}),
      deprecated: program({ deprecated: true }),
      retired: program({ retired: true }),
      noTarget: program({ activityTarget: undefined }),
      otherAgent: program({ agentsSupported: [AgentMap.Connect] }),
    } as unknown as Parameters<typeof getOmenstratProgramIds>[0];

    expect(getOmenstratProgramIds(programs)).toEqual(['kept']);
  });
});
