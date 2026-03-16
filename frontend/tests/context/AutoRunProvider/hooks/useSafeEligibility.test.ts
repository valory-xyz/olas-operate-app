import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { AGENT_CONFIG } from '../../../../config/agents';
import { AgentMap } from '../../../../constants/agent';
import { EvmChainIdMap } from '../../../../constants/chains';
import { useSafeEligibility } from '../../../../context/AutoRunProvider/hooks/useSafeEligibility';
import { useMasterWalletContext } from '../../../../hooks';
import { useMultisigs } from '../../../../hooks/useMultisig';
import { WalletService } from '../../../../service/Wallet';
import {
  BACKUP_SIGNER_STATUS,
  getSafeEligibility,
} from '../../../../utils/safe';
import {
  BACKUP_SIGNER_ADDRESS,
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
  makeAutoRunAgentMeta,
  makeMasterEoa,
  makeMasterSafe,
} from '../../../helpers/factories';

jest.mock('../../../../hooks', () => ({
  useMasterWalletContext: jest.fn(),
}));
jest.mock('../../../../hooks/useMultisig', () => ({
  useMultisigs: jest.fn(),
}));
jest.mock('../../../../utils/safe', () => ({
  ...jest.requireActual('../../../../utils/safe'),
  getSafeEligibility: jest.fn(),
}));
jest.mock('../../../../service/Wallet', () => ({
  WalletService: { createSafe: jest.fn() },
}));

const mockUseMasterWalletContext =
  useMasterWalletContext as jest.MockedFunction<typeof useMasterWalletContext>;
const mockUseMultisigs = useMultisigs as jest.MockedFunction<
  typeof useMultisigs
>;
const mockGetSafeEligibility = getSafeEligibility as jest.MockedFunction<
  typeof getSafeEligibility
>;
const mockCreateSafe = WalletService.createSafe as jest.Mock;

const defaultMasterEoa = makeMasterEoa(DEFAULT_EOA_ADDRESS);
const gnosisSafe = makeMasterSafe(EvmChainIdMap.Gnosis, DEFAULT_SAFE_ADDRESS);

describe('useSafeEligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMasterWalletContext.mockReturnValue({
      masterSafes: [gnosisSafe],
      masterEoa: defaultMasterEoa,
    } as unknown as ReturnType<typeof useMasterWalletContext>);
    mockUseMultisigs.mockReturnValue({
      masterSafesOwners: [],
    } as unknown as ReturnType<typeof useMultisigs>);
  });

  describe('canCreateSafeForChain', () => {
    it.each([
      {
        name: 'returns ok=true when HasSafe',
        eligibility: {
          status: BACKUP_SIGNER_STATUS.HasSafe,
          canProceed: true,
          shouldCreateSafe: false,
        },
        expected: { ok: true, isLoading: false },
      },
      {
        name: 'returns ok=true when Ready',
        eligibility: {
          status: BACKUP_SIGNER_STATUS.Ready,
          canProceed: true,
          shouldCreateSafe: true,
          backupOwner: BACKUP_SIGNER_ADDRESS,
        },
        expected: { ok: true, isLoading: false },
      },
      {
        name: 'returns ok=false when MissingBackupSigner',
        eligibility: {
          status: BACKUP_SIGNER_STATUS.MissingBackupSigner,
          canProceed: false,
          shouldCreateSafe: false,
        },
        expected: {
          ok: false,
          isLoading: false,
          reason: 'Backup signer required',
        },
      },
      {
        name: 'returns ok=false when MultipleBackupSigners',
        eligibility: {
          status: BACKUP_SIGNER_STATUS.MultipleBackupSigners,
          canProceed: false,
          shouldCreateSafe: false,
        },
        expected: { ok: false, reason: 'Multiple backup signers detected' },
      },
      {
        name: 'returns isLoading=true when Loading',
        eligibility: {
          status: BACKUP_SIGNER_STATUS.Loading,
          canProceed: false,
          shouldCreateSafe: false,
        },
        expected: { ok: false, isLoading: true, reason: 'Safe data loading' },
      },
    ])('$name', ({ eligibility, expected }) => {
      mockGetSafeEligibility.mockReturnValue(eligibility);
      const { result } = renderHook(() => useSafeEligibility());
      const actual = result.current.canCreateSafeForChain(EvmChainIdMap.Gnosis);
      expect(actual).toEqual(expect.objectContaining(expected));
    });
  });

  describe('createSafeIfNeeded', () => {
    const traderConfig = AGENT_CONFIG[AgentMap.PredictTrader];
    const meta = makeAutoRunAgentMeta(
      AgentMap.PredictTrader,
      AGENT_CONFIG[AgentMap.PredictTrader],
    );

    it('does nothing when safe already exists (HasSafe)', async () => {
      mockGetSafeEligibility.mockReturnValue({
        status: BACKUP_SIGNER_STATUS.HasSafe,
        canProceed: true,
        shouldCreateSafe: false,
      });
      const { result } = renderHook(() => useSafeEligibility());
      await act(async () => {
        await result.current.createSafeIfNeeded(meta);
      });
      expect(mockCreateSafe).not.toHaveBeenCalled();
    });

    it('calls WalletService.createSafe when Ready', async () => {
      mockGetSafeEligibility.mockReturnValue({
        status: BACKUP_SIGNER_STATUS.Ready,
        canProceed: true,
        shouldCreateSafe: true,
        backupOwner: BACKUP_SIGNER_ADDRESS,
      });
      mockCreateSafe.mockResolvedValue(undefined);
      const { result } = renderHook(() => useSafeEligibility());
      await act(async () => {
        await result.current.createSafeIfNeeded(meta);
      });
      expect(mockCreateSafe).toHaveBeenCalledWith(
        traderConfig.middlewareHomeChainId,
        BACKUP_SIGNER_ADDRESS,
      );
    });

    it('throws when canProceed is false', async () => {
      mockGetSafeEligibility.mockReturnValue({
        status: BACKUP_SIGNER_STATUS.MissingBackupSigner,
        canProceed: false,
        shouldCreateSafe: false,
      });
      const { result } = renderHook(() => useSafeEligibility());
      await expect(
        act(async () => {
          await result.current.createSafeIfNeeded(meta);
        }),
      ).rejects.toThrow('Safe eligibility failed');
    });
  });
});
