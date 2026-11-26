import { renderHook } from '@testing-library/react';

import { useAreOmenstratContractsFull } from '../../../../components/SelectStakingPage/hooks/useAreOmenstratContractsFull';
import { AgentMap } from '../../../../constants/agent';
import { STAKING_PROGRAM_IDS } from '../../../../constants/stakingProgram';
import { useServices, useStakingContractContext } from '../../../../hooks';

jest.mock('../../../../hooks', () => ({
  useServices: jest.fn(),
  useStakingContractContext: jest.fn(),
}));

const OMENSTRAT_IDS = [
  STAKING_PROGRAM_IDS.OmenstratI,
  STAKING_PROGRAM_IDS.OmenstratII,
  STAKING_PROGRAM_IDS.OmenstratIII,
  STAKING_PROGRAM_IDS.OmenstratIV,
  STAKING_PROGRAM_IDS.OmenstratV,
  STAKING_PROGRAM_IDS.OmenstratVI,
  STAKING_PROGRAM_IDS.OmenstratVII,
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
    delete record[STAKING_PROGRAM_IDS.OmenstratIV];
    expect(setup(record)).toBe(false);
    expect(setup(undefined)).toBe(false);
  });

  it("is false on any other agent's list", () => {
    expect(setup(allOmenstrat(full), AgentMap.Connect)).toBe(false);
  });
});
