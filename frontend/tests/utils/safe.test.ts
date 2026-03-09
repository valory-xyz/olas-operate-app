import { EvmChainIdMap } from '../../constants/chains';
import {
  BACKUP_SIGNER_STATUS,
  getSafeEligibility,
  getSafeEligibilityMessage,
} from '../../utils/safe';
import {
  BACKUP_SIGNER_ADDRESS,
  BACKUP_SIGNER_ADDRESS_2,
  DEFAULT_EOA_ADDRESS,
  makeMasterEoa,
  makeMasterSafe,
  makeMultisigOwners,
} from '../helpers/factories';

const masterEoa = makeMasterEoa();

describe('getSafeEligibility', () => {
  const chainId = EvmChainIdMap.Base;

  it('returns loading status when masterSafes is undefined', () => {
    const result = getSafeEligibility({
      chainId,
      masterSafes: undefined,
      masterSafesOwners: [],
      masterEoa,
    });
    expect(result.status).toBe(BACKUP_SIGNER_STATUS.Loading);
    expect(result.canProceed).toBe(false);
    expect(result.shouldCreateSafe).toBe(false);
  });

  it('returns loading status when masterSafesOwners is undefined', () => {
    const result = getSafeEligibility({
      chainId,
      masterSafes: [],
      masterSafesOwners: undefined,
      masterEoa,
    });
    expect(result.status).toBe(BACKUP_SIGNER_STATUS.Loading);
    expect(result.canProceed).toBe(false);
  });

  it('returns HasSafe when safe already exists on selected chain', () => {
    const result = getSafeEligibility({
      chainId,
      masterSafes: [makeMasterSafe(chainId)],
      masterSafesOwners: [],
      masterEoa,
    });
    expect(result.status).toBe(BACKUP_SIGNER_STATUS.HasSafe);
    expect(result.canProceed).toBe(true);
    expect(result.shouldCreateSafe).toBe(false);
  });

  it('returns Ready with backupOwner when exactly one backup signer exists on another chain', () => {
    const result = getSafeEligibility({
      chainId,
      masterSafes: [makeMasterSafe(EvmChainIdMap.Gnosis)],
      masterSafesOwners: [
        makeMultisigOwners(EvmChainIdMap.Gnosis, [
          DEFAULT_EOA_ADDRESS,
          BACKUP_SIGNER_ADDRESS,
        ]),
      ],
      masterEoa,
    });
    expect(result.status).toBe(BACKUP_SIGNER_STATUS.Ready);
    expect(result.canProceed).toBe(true);
    expect(result.shouldCreateSafe).toBe(true);
    expect(result.backupOwner).toBe(BACKUP_SIGNER_ADDRESS);
  });

  it('returns MissingBackupSigner when no backup signers exist', () => {
    const result = getSafeEligibility({
      chainId,
      masterSafes: [makeMasterSafe(EvmChainIdMap.Gnosis)],
      masterSafesOwners: [
        makeMultisigOwners(EvmChainIdMap.Gnosis, [DEFAULT_EOA_ADDRESS]),
      ],
      masterEoa,
    });
    expect(result.status).toBe(BACKUP_SIGNER_STATUS.MissingBackupSigner);
    expect(result.canProceed).toBe(false);
    expect(result.shouldCreateSafe).toBe(false);
  });

  it('returns MultipleBackupSigners when more than one backup signer exists', () => {
    const result = getSafeEligibility({
      chainId,
      masterSafes: [makeMasterSafe(EvmChainIdMap.Gnosis)],
      masterSafesOwners: [
        makeMultisigOwners(EvmChainIdMap.Gnosis, [
          DEFAULT_EOA_ADDRESS,
          BACKUP_SIGNER_ADDRESS,
          BACKUP_SIGNER_ADDRESS_2,
        ]),
      ],
      masterEoa,
    });
    expect(result.status).toBe(BACKUP_SIGNER_STATUS.MultipleBackupSigners);
    expect(result.canProceed).toBe(false);
  });

  it('returns MissingBackupSigner when no safes exist on other chains', () => {
    const result = getSafeEligibility({
      chainId,
      masterSafes: [],
      masterSafesOwners: [],
      masterEoa,
    });
    expect(result.status).toBe(BACKUP_SIGNER_STATUS.MissingBackupSigner);
    expect(result.canProceed).toBe(false);
  });

  it('ignores owners from the selected chain when finding backup signers', () => {
    const result = getSafeEligibility({
      chainId,
      masterSafes: [makeMasterSafe(chainId)],
      masterSafesOwners: [
        makeMultisigOwners(chainId, [
          DEFAULT_EOA_ADDRESS,
          BACKUP_SIGNER_ADDRESS,
        ]),
      ],
      masterEoa,
    });
    // Safe exists on selected chain -> HasSafe
    expect(result.status).toBe(BACKUP_SIGNER_STATUS.HasSafe);
    expect(result.canProceed).toBe(true);
  });
});

describe('getSafeEligibilityMessage', () => {
  it('returns missing backup signer message', () => {
    const msg = getSafeEligibilityMessage(
      BACKUP_SIGNER_STATUS.MissingBackupSigner,
    );
    expect(msg).toContain('backup signer is required');
  });

  it('returns multiple backup signers message', () => {
    const msg = getSafeEligibilityMessage(
      BACKUP_SIGNER_STATUS.MultipleBackupSigners,
    );
    expect(msg).toContain('same backup signer address');
  });

  it('returns loading message for Loading status', () => {
    const msg = getSafeEligibilityMessage(BACKUP_SIGNER_STATUS.Loading);
    expect(msg).toContain('still loading');
  });

  it('returns loading message for unknown status', () => {
    // @ts-expect-error Testing unknown status value
    const msg = getSafeEligibilityMessage('unknown');
    expect(msg).toContain('still loading');
  });
});
