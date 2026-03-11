/* eslint-disable @typescript-eslint/no-var-requires */
import {
  checkNewMasterEoaSwapStatus,
  getBackupWalletStatus,
  parseRecoveryFundingRequirements,
} from '../../../components/AccountRecovery/utils';
import { AddressZero } from '../../../constants/address';
import {
  CHAIN_IMAGE_MAP,
  EvmChainIdMap,
  MiddlewareChainMap,
} from '../../../constants/chains';
import { Address } from '../../../types/Address';
import { RecoveryFundingRequirements } from '../../../types/Recovery';
import {
  BACKUP_SIGNER_ADDRESS,
  BACKUP_SIGNER_ADDRESS_2,
  DEFAULT_SAFE_ADDRESS,
  POLYGON_SAFE_ADDRESS,
  UNKNOWN_TOKEN_ADDRESS,
} from '../../helpers/factories';

jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../constants/providers', () => ({}));

describe('getBackupWalletStatus', () => {
  it('returns hasBackupWalletsAcrossEveryChain=true when all chains have backup owners', () => {
    const safes = {
      [MiddlewareChainMap.GNOSIS]: {
        [DEFAULT_SAFE_ADDRESS]: {
          backup_owners: [BACKUP_SIGNER_ADDRESS],
        },
      },
      [MiddlewareChainMap.POLYGON]: {
        [POLYGON_SAFE_ADDRESS]: {
          backup_owners: [BACKUP_SIGNER_ADDRESS_2],
        },
      },
    };
    const masterSafes = [
      { address: DEFAULT_SAFE_ADDRESS, evmChainId: EvmChainIdMap.Gnosis },
      { address: POLYGON_SAFE_ADDRESS, evmChainId: EvmChainIdMap.Polygon },
    ];

    const result = getBackupWalletStatus(safes as never, masterSafes);
    expect(result.hasBackupWalletsAcrossEveryChain).toBe(true);
    expect(result.backupAddress).toBe(BACKUP_SIGNER_ADDRESS);
  });

  it('returns hasBackupWalletsAcrossEveryChain=false when a chain has no backup owners', () => {
    const safes = {
      [MiddlewareChainMap.GNOSIS]: {
        [DEFAULT_SAFE_ADDRESS]: {
          backup_owners: [],
        },
      },
      [MiddlewareChainMap.POLYGON]: {
        [POLYGON_SAFE_ADDRESS]: {
          backup_owners: [BACKUP_SIGNER_ADDRESS_2],
        },
      },
    };
    const masterSafes = [
      { address: DEFAULT_SAFE_ADDRESS, evmChainId: EvmChainIdMap.Gnosis },
      { address: POLYGON_SAFE_ADDRESS, evmChainId: EvmChainIdMap.Polygon },
    ];

    const result = getBackupWalletStatus(safes as never, masterSafes);
    expect(result.hasBackupWalletsAcrossEveryChain).toBe(false);
  });

  it('returns areAllBackupOwnersSame=true when all chains have the same backup owners', () => {
    const safes = {
      [MiddlewareChainMap.GNOSIS]: {
        [DEFAULT_SAFE_ADDRESS]: {
          backup_owners: [BACKUP_SIGNER_ADDRESS],
        },
      },
      [MiddlewareChainMap.POLYGON]: {
        [POLYGON_SAFE_ADDRESS]: {
          backup_owners: [BACKUP_SIGNER_ADDRESS],
        },
      },
    };
    const masterSafes = [
      { address: DEFAULT_SAFE_ADDRESS, evmChainId: EvmChainIdMap.Gnosis },
      { address: POLYGON_SAFE_ADDRESS, evmChainId: EvmChainIdMap.Polygon },
    ];

    const result = getBackupWalletStatus(safes as never, masterSafes);
    expect(result.areAllBackupOwnersSame).toBe(true);
  });

  it('returns areAllBackupOwnersSame=false when chains have different backup owners', () => {
    const safes = {
      [MiddlewareChainMap.GNOSIS]: {
        [DEFAULT_SAFE_ADDRESS]: {
          backup_owners: [BACKUP_SIGNER_ADDRESS],
        },
      },
      [MiddlewareChainMap.POLYGON]: {
        [POLYGON_SAFE_ADDRESS]: {
          backup_owners: [BACKUP_SIGNER_ADDRESS_2],
        },
      },
    };
    const masterSafes = [
      { address: DEFAULT_SAFE_ADDRESS, evmChainId: EvmChainIdMap.Gnosis },
      { address: POLYGON_SAFE_ADDRESS, evmChainId: EvmChainIdMap.Polygon },
    ];

    const result = getBackupWalletStatus(safes as never, masterSafes);
    expect(result.areAllBackupOwnersSame).toBe(false);
  });

  it('compares backup owners case-insensitively', () => {
    const upperCaseAddress = BACKUP_SIGNER_ADDRESS.toUpperCase() as Address;
    const lowerCaseAddress = BACKUP_SIGNER_ADDRESS.toLowerCase() as Address;

    const safes = {
      [MiddlewareChainMap.GNOSIS]: {
        [DEFAULT_SAFE_ADDRESS]: {
          backup_owners: [upperCaseAddress],
        },
      },
      [MiddlewareChainMap.POLYGON]: {
        [POLYGON_SAFE_ADDRESS]: {
          backup_owners: [lowerCaseAddress],
        },
      },
    };
    const masterSafes = [
      { address: DEFAULT_SAFE_ADDRESS, evmChainId: EvmChainIdMap.Gnosis },
      { address: POLYGON_SAFE_ADDRESS, evmChainId: EvmChainIdMap.Polygon },
    ];

    const result = getBackupWalletStatus(safes as never, masterSafes);
    expect(result.areAllBackupOwnersSame).toBe(true);
  });

  it('returns backupAddress from the first chain in the list', () => {
    const safes = {
      [MiddlewareChainMap.GNOSIS]: {
        [DEFAULT_SAFE_ADDRESS]: {
          backup_owners: [BACKUP_SIGNER_ADDRESS],
        },
      },
      [MiddlewareChainMap.POLYGON]: {
        [POLYGON_SAFE_ADDRESS]: {
          backup_owners: [BACKUP_SIGNER_ADDRESS_2],
        },
      },
    };
    const masterSafes = [
      { address: DEFAULT_SAFE_ADDRESS, evmChainId: EvmChainIdMap.Gnosis },
      { address: POLYGON_SAFE_ADDRESS, evmChainId: EvmChainIdMap.Polygon },
    ];

    const result = getBackupWalletStatus(safes as never, masterSafes);
    expect(result.backupAddress).toBe(BACKUP_SIGNER_ADDRESS);
  });
});

type PendingSwaps = RecoveryFundingRequirements['pending_backup_owner_swaps'];

describe('checkNewMasterEoaSwapStatus', () => {
  it('returns areAllSwapsCompleted=true when no chains have pending swaps', () => {
    const pendingSwaps = {
      [MiddlewareChainMap.GNOSIS]: [],
      [MiddlewareChainMap.POLYGON]: [],
    } as unknown as PendingSwaps;

    const result = checkNewMasterEoaSwapStatus(pendingSwaps);
    expect(result.areAllSwapsCompleted).toBe(true);
    expect(result.chainsWithPendingSwaps).toEqual([]);
  });

  it('returns areAllSwapsCompleted=false when a chain has pending swaps', () => {
    const pendingSwaps = {
      [MiddlewareChainMap.GNOSIS]: [DEFAULT_SAFE_ADDRESS],
      [MiddlewareChainMap.POLYGON]: [],
    } as unknown as PendingSwaps;

    const result = checkNewMasterEoaSwapStatus(pendingSwaps);
    expect(result.areAllSwapsCompleted).toBe(false);
    expect(result.chainsWithPendingSwaps).toEqual([MiddlewareChainMap.GNOSIS]);
  });

  it('returns all chains with pending swaps', () => {
    const pendingSwaps = {
      [MiddlewareChainMap.GNOSIS]: [DEFAULT_SAFE_ADDRESS],
      [MiddlewareChainMap.POLYGON]: [POLYGON_SAFE_ADDRESS],
    } as unknown as PendingSwaps;

    const result = checkNewMasterEoaSwapStatus(pendingSwaps);
    expect(result.areAllSwapsCompleted).toBe(false);
    expect(result.chainsWithPendingSwaps).toHaveLength(2);
    expect(result.chainsWithPendingSwaps).toContain(MiddlewareChainMap.GNOSIS);
    expect(result.chainsWithPendingSwaps).toContain(MiddlewareChainMap.POLYGON);
  });

  it('returns areAllSwapsCompleted=true for empty object', () => {
    const result = checkNewMasterEoaSwapStatus({} as unknown as PendingSwaps);
    expect(result.areAllSwapsCompleted).toBe(true);
    expect(result.chainsWithPendingSwaps).toEqual([]);
  });
});

describe('parseRecoveryFundingRequirements', () => {
  it('parses native token (XDAI) refill requirement on Gnosis', () => {
    const fundingRequirements: RecoveryFundingRequirements = {
      balances: {} as RecoveryFundingRequirements['balances'],
      is_refill_required: true,
      pending_backup_owner_swaps:
        {} as RecoveryFundingRequirements['pending_backup_owner_swaps'],
      refill_requirements: {
        [MiddlewareChainMap.GNOSIS]: {
          [DEFAULT_SAFE_ADDRESS]: {
            [AddressZero]: '1000000000000000000', // 1 XDAI
          },
        },
      } as RecoveryFundingRequirements['refill_requirements'],
      total_requirements: {
        [MiddlewareChainMap.GNOSIS]: {
          [DEFAULT_SAFE_ADDRESS]: {
            [AddressZero]: '2000000000000000000', // 2 XDAI total
          },
        },
      } as RecoveryFundingRequirements['total_requirements'],
    };

    const rows = parseRecoveryFundingRequirements(fundingRequirements);
    expect(rows).toHaveLength(1);
    expect(rows[0].symbol).toBe('XDAI');
    expect(rows[0].chainName).toBe(MiddlewareChainMap.GNOSIS);
    expect(rows[0].pendingAmount).toBe(1);
    expect(rows[0].totalAmount).toBe(2);
    expect(rows[0].areFundsReceived).toBe(false);
    expect(rows[0].iconSrc).toBe(CHAIN_IMAGE_MAP[EvmChainIdMap.Gnosis]);
  });

  it('marks areFundsReceived=true when refill amount is zero', () => {
    const fundingRequirements: RecoveryFundingRequirements = {
      balances: {} as RecoveryFundingRequirements['balances'],
      is_refill_required: false,
      pending_backup_owner_swaps:
        {} as RecoveryFundingRequirements['pending_backup_owner_swaps'],
      refill_requirements: {
        [MiddlewareChainMap.GNOSIS]: {
          [DEFAULT_SAFE_ADDRESS]: {
            [AddressZero]: '0',
          },
        },
      } as RecoveryFundingRequirements['refill_requirements'],
      total_requirements: {
        [MiddlewareChainMap.GNOSIS]: {
          [DEFAULT_SAFE_ADDRESS]: {
            [AddressZero]: '1000000000000000000',
          },
        },
      } as RecoveryFundingRequirements['total_requirements'],
    };

    const rows = parseRecoveryFundingRequirements(fundingRequirements);
    expect(rows).toHaveLength(1);
    expect(rows[0].areFundsReceived).toBe(true);
    expect(rows[0].pendingAmount).toBe(0);
  });

  it('returns multiple rows for native tokens across multiple chains', () => {
    const fundingRequirements: RecoveryFundingRequirements = {
      balances: {} as RecoveryFundingRequirements['balances'],
      is_refill_required: true,
      pending_backup_owner_swaps:
        {} as RecoveryFundingRequirements['pending_backup_owner_swaps'],
      refill_requirements: {
        [MiddlewareChainMap.GNOSIS]: {
          [DEFAULT_SAFE_ADDRESS]: {
            [AddressZero]: '1000000000000000000',
          },
        },
        [MiddlewareChainMap.POLYGON]: {
          [POLYGON_SAFE_ADDRESS]: {
            [AddressZero]: '2000000000000000000',
          },
        },
      } as RecoveryFundingRequirements['refill_requirements'],
      total_requirements: {
        [MiddlewareChainMap.GNOSIS]: {
          [DEFAULT_SAFE_ADDRESS]: {
            [AddressZero]: '1000000000000000000',
          },
        },
        [MiddlewareChainMap.POLYGON]: {
          [POLYGON_SAFE_ADDRESS]: {
            [AddressZero]: '2000000000000000000',
          },
        },
      } as RecoveryFundingRequirements['total_requirements'],
    };

    const rows = parseRecoveryFundingRequirements(fundingRequirements);
    expect(rows).toHaveLength(2);
    const symbols = rows.map((r) => r.symbol);
    expect(symbols).toContain('XDAI');
    expect(symbols).toContain('POL');
  });

  it('skips unknown token addresses', () => {
    const fundingRequirements: RecoveryFundingRequirements = {
      balances: {} as RecoveryFundingRequirements['balances'],
      is_refill_required: true,
      pending_backup_owner_swaps:
        {} as RecoveryFundingRequirements['pending_backup_owner_swaps'],
      refill_requirements: {
        [MiddlewareChainMap.GNOSIS]: {
          [DEFAULT_SAFE_ADDRESS]: {
            [UNKNOWN_TOKEN_ADDRESS]: '1000000000000000000',
          },
        },
      } as RecoveryFundingRequirements['refill_requirements'],
      total_requirements: {
        [MiddlewareChainMap.GNOSIS]: {
          [DEFAULT_SAFE_ADDRESS]: {
            [UNKNOWN_TOKEN_ADDRESS]: '1000000000000000000',
          },
        },
      } as RecoveryFundingRequirements['total_requirements'],
    };

    const rows = parseRecoveryFundingRequirements(fundingRequirements);
    expect(rows).toHaveLength(0);
  });

  it('returns empty array for empty refill_requirements', () => {
    const fundingRequirements: RecoveryFundingRequirements = {
      balances: {} as RecoveryFundingRequirements['balances'],
      is_refill_required: false,
      pending_backup_owner_swaps:
        {} as RecoveryFundingRequirements['pending_backup_owner_swaps'],
      refill_requirements:
        {} as RecoveryFundingRequirements['refill_requirements'],
      total_requirements:
        {} as RecoveryFundingRequirements['total_requirements'],
    };

    const rows = parseRecoveryFundingRequirements(fundingRequirements);
    expect(rows).toHaveLength(0);
  });

  it('defaults totalAmount to 0 when total_requirements entry is missing', () => {
    const fundingRequirements: RecoveryFundingRequirements = {
      balances: {} as RecoveryFundingRequirements['balances'],
      is_refill_required: true,
      pending_backup_owner_swaps:
        {} as RecoveryFundingRequirements['pending_backup_owner_swaps'],
      refill_requirements: {
        [MiddlewareChainMap.GNOSIS]: {
          [DEFAULT_SAFE_ADDRESS]: {
            [AddressZero]: '500000000000000000',
          },
        },
      } as RecoveryFundingRequirements['refill_requirements'],
      // No matching entry in total_requirements
      total_requirements:
        {} as RecoveryFundingRequirements['total_requirements'],
    };

    const rows = parseRecoveryFundingRequirements(fundingRequirements);
    expect(rows).toHaveLength(1);
    expect(rows[0].totalAmount).toBe(0);
    expect(rows[0].pendingAmount).toBe(0.5);
  });
});
