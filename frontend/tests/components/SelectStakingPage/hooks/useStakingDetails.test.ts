import { renderHook } from '@testing-library/react';

import { EvmChainIdMap } from '../../../../constants/chains';
import { STAKING_PROGRAM_IDS } from '../../../../constants/stakingProgram';
import { StakingContractDetails } from '../../../../types/Autonolas';
import {
  DEFAULT_STAKING_PROGRAM_ID,
  makeStakingContractDetails,
} from '../../../helpers/factories';

const TEST_PROGRAM = STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3;
const GNOSIS = EvmChainIdMap.Gnosis;
const PROGRAM_NAME = 'Pearl Beta 3';

const mockUseServices = jest.fn();
const mockUseStakingContractContext = jest.fn();

jest.mock('../../../../hooks', () => ({
  useServices: (...args: unknown[]) => mockUseServices(...args),
  useStakingContractContext: (...args: unknown[]) =>
    mockUseStakingContractContext(...args),
}));

/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
jest.mock('../../../../config/stakingPrograms', () => {
  const { EvmChainIdMap: Chains } = require('../../../../constants/chains');
  const {
    STAKING_PROGRAM_IDS: Programs,
  } = require('../../../../constants/stakingProgram');
  return {
    STAKING_PROGRAMS: {
      [Chains.Gnosis]: {
        [Programs.PearlBetaMechMarketplace3]: { name: 'Pearl Beta 3' },
      },
    },
  };
});

// Import after mocks are set up
const {
  useEachStakingDetails,
} = require('../../../../components/SelectStakingPage/hooks/useStakingDetails');
/* eslint-enable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */

const setupMocks = (
  contractDetailsOverrides?: Partial<StakingContractDetails>,
  omitRecord = false,
) => {
  mockUseServices.mockReturnValue({
    selectedAgentConfig: { evmHomeChainId: GNOSIS },
  });

  if (omitRecord) {
    mockUseStakingContractContext.mockReturnValue({
      allStakingContractDetailsRecord: undefined,
    });
  } else {
    const details = contractDetailsOverrides
      ? makeStakingContractDetails(contractDetailsOverrides)
      : undefined;
    mockUseStakingContractContext.mockReturnValue({
      allStakingContractDetailsRecord: details
        ? { [DEFAULT_STAKING_PROGRAM_ID]: details }
        : {},
    });
  }
};

describe('useEachStakingDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns correct slotsLeft when services are occupying slots', () => {
    setupMocks({
      maxNumServices: 10,
      serviceIds: [1, 2, 3],
    });

    const { result } = renderHook(() => useEachStakingDetails(TEST_PROGRAM));

    expect(result.current.slotsLeft).toBe(7);
  });

  it('returns totalSlots from contract details', () => {
    setupMocks({
      maxNumServices: 10,
      serviceIds: [1, 2, 3],
    });

    const { result } = renderHook(() => useEachStakingDetails(TEST_PROGRAM));

    expect(result.current.totalSlots).toBe(10);
  });

  it('returns name from STAKING_PROGRAMS meta', () => {
    setupMocks({
      maxNumServices: 5,
      serviceIds: [],
    });

    const { result } = renderHook(() => useEachStakingDetails(TEST_PROGRAM));

    expect(result.current.name).toBe(PROGRAM_NAME);
  });

  it('defaults maxNumServices to 0 when contractDetails is undefined', () => {
    setupMocks(undefined, true);

    const { result } = renderHook(() => useEachStakingDetails(TEST_PROGRAM));

    expect(result.current.totalSlots).toBe(0);
    expect(result.current.slotsLeft).toBe(0);
  });

  it('defaults serviceIds to empty when contractDetails is undefined', () => {
    setupMocks(undefined, true);

    const { result } = renderHook(() => useEachStakingDetails(TEST_PROGRAM));

    // slotsLeft = 0 (default maxNumServices) - 0 (empty serviceIds) = 0
    expect(result.current.slotsLeft).toBe(0);
  });

  it('returns negative slotsLeft when overfull', () => {
    setupMocks({
      maxNumServices: 2,
      serviceIds: [1, 2, 3],
    });

    const { result } = renderHook(() => useEachStakingDetails(TEST_PROGRAM));

    expect(result.current.slotsLeft).toBe(-1);
  });
});
