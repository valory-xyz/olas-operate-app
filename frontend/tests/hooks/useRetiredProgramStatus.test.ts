import { renderHook } from '@testing-library/react';

import { STAKING_PROGRAMS } from '../../config/stakingPrograms';
import { EvmChainIdMap } from '../../constants/chains';
import { STAKING_PROGRAM_IDS } from '../../constants/stakingProgram';
import { useIsPolySafeService } from '../../hooks/useIsPolySafeService';
import { useRetiredProgramStatus } from '../../hooks/useRetiredProgramStatus';
import { useServices } from '../../hooks/useServices';
import { useActiveStakingContractDetails } from '../../hooks/useStakingContractDetails';
import { useStakingProgram } from '../../hooks/useStakingProgram';
import { useStore } from '../../hooks/useStore';
import { DEFAULT_SERVICE_CONFIG_ID } from '../helpers/factories';

jest.mock('../../hooks/useIsPolySafeService', () => ({
  useIsPolySafeService: jest.fn(),
}));
jest.mock('../../hooks/useServices', () => ({ useServices: jest.fn() }));
jest.mock('../../hooks/useStakingContractDetails', () => ({
  useActiveStakingContractDetails: jest.fn(),
}));
jest.mock('../../hooks/useStakingProgram', () => ({
  useStakingProgram: jest.fn(),
}));
jest.mock('../../hooks/useStore', () => ({ useStore: jest.fn() }));

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

const RETIRED = STAKING_PROGRAM_IDS.PolystratI;
const refetchMultisigType = jest.fn();
const refetchStakingDetails = jest.fn();

const setup = ({
  isOnRetiredProgram = true,
  programName,
  storedProgramId,
}: {
  isOnRetiredProgram?: boolean;
  programName?: string;
  storedProgramId?: string;
} = {}) => {
  (useServices as jest.Mock).mockReturnValue({
    selectedService: { service_config_id: DEFAULT_SERVICE_CONFIG_ID },
    selectedAgentConfig: { evmHomeChainId: EvmChainIdMap.Polygon },
  });
  (useStakingProgram as jest.Mock).mockReturnValue({
    selectedStakingProgramMeta: programName ? { name: programName } : undefined,
  });
  (useStore as jest.Mock).mockReturnValue({
    storeState: storedProgramId
      ? {
          retiredStakingProgramIdByServiceConfigId: {
            [DEFAULT_SERVICE_CONFIG_ID]: storedProgramId,
          },
        }
      : {},
  });
  (useIsPolySafeService as jest.Mock).mockReturnValue({
    isOnRetiredProgram,
    retiredSafeState: 'withdrawalOnly',
    isMultisigTypeFetching: false,
    refetch: refetchMultisigType,
  });
  (useActiveStakingContractDetails as jest.Mock).mockReturnValue({
    stakingDetailsState: { state: 'loading' },
    isSelectedStakingContractDetailsFetching: true,
    refetchSelectedStakingContractDetails: refetchStakingDetails,
  });
  return renderHook(() => useRetiredProgramStatus());
};

describe('useRetiredProgramStatus', () => {
  it('classifies a service on a retired program', () => {
    const { result } = setup();
    expect(result.current.status).toEqual({ kind: 'withdrawalOnly' });
    expect(result.current.stakingDetailsRetry).toEqual({
      onRetry: refetchStakingDetails,
      isRetrying: true,
    });
    expect(result.current.safeTypeRetry.onRetry).toBe(refetchMultisigType);
  });

  it('is null off a retired program', () => {
    const { result } = setup({ isOnRetiredProgram: false });
    expect(result.current.status).toBeNull();
  });

  it('names the selected program when it has one', () => {
    const { result } = setup({ programName: 'Live', storedProgramId: RETIRED });
    expect(result.current.stakingProgramName).toBe('Live');
  });

  it('names the retired program saved before the no_staking PATCH', () => {
    const { result } = setup({ storedProgramId: RETIRED });
    expect(result.current.stakingProgramName).toBe(
      STAKING_PROGRAMS[EvmChainIdMap.Polygon][RETIRED].name,
    );
  });

  it('names nothing when no program was saved', () => {
    const { result } = setup();
    expect(result.current.stakingProgramName).toBeUndefined();
  });

  it('keeps its status and retries stable across renders', () => {
    const { result, rerender } = setup();
    const first = result.current;
    rerender();
    expect(result.current.status).toBe(first.status);
    expect(result.current.safeTypeRetry).toBe(first.safeTypeRetry);
    expect(result.current.stakingDetailsRetry).toBe(first.stakingDetailsRetry);
  });
});
