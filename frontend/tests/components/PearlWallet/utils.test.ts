/* eslint-disable @typescript-eslint/no-var-requires */
import { GNOSIS_TOKEN_CONFIG, TokenSymbolMap } from '../../../config/tokens';
import { AddressZero } from '../../../constants/address';
import { EvmChainId, EvmChainIdMap } from '../../../constants/chains';
import { Address, AddressBalanceRecord, Maybe } from '../../../types';
import {
  DEFAULT_SAFE_ADDRESS,
  DEFAULT_SERVICE_CONFIG_ID,
  MOCK_SERVICE_CONFIG_ID_2,
} from '../../helpers/factories';

jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);
jest.mock('../../../constants/providers', () => ({}));

// Dynamically import after mocks are in place
const { getInitialDepositForMasterSafe } =
  require('../../../components/PearlWallet/utils') as typeof import('../../../components/PearlWallet/utils');
/* eslint-enable @typescript-eslint/no-var-requires */

const GNOSIS_OLAS_ADDRESS = GNOSIS_TOKEN_CONFIG.OLAS!.address! as Address;

describe('getInitialDepositForMasterSafe', () => {
  const walletChainId: EvmChainId = EvmChainIdMap.Gnosis;

  it('returns undefined when masterSafeAddress is null', () => {
    const mockGetRefill = jest.fn();
    const result = getInitialDepositForMasterSafe(
      walletChainId,
      null,
      [DEFAULT_SERVICE_CONFIG_ID],
      mockGetRefill,
    );
    expect(result).toBeUndefined();
    expect(mockGetRefill).not.toHaveBeenCalled();
  });

  it('returns undefined when masterSafeAddress is undefined (typed as null)', () => {
    const mockGetRefill = jest.fn();
    const result = getInitialDepositForMasterSafe(
      walletChainId,
      null,
      [DEFAULT_SERVICE_CONFIG_ID],
      mockGetRefill,
    );
    expect(result).toBeUndefined();
  });

  it('returns an empty object when getRefillRequirementsOf returns undefined for all services', () => {
    const mockGetRefill = jest.fn().mockReturnValue(undefined);
    const result = getInitialDepositForMasterSafe(
      walletChainId,
      DEFAULT_SAFE_ADDRESS,
      [DEFAULT_SERVICE_CONFIG_ID],
      mockGetRefill,
    );
    expect(result).toEqual({});
  });

  it('returns an empty object when getRefillRequirementsOf returns null for all services', () => {
    const mockGetRefill = jest.fn().mockReturnValue(null);
    const result = getInitialDepositForMasterSafe(
      walletChainId,
      DEFAULT_SAFE_ADDRESS,
      [DEFAULT_SERVICE_CONFIG_ID],
      mockGetRefill,
    );
    expect(result).toEqual({});
  });

  it('returns an empty object when refill data has no matching masterSafeAddress', () => {
    const differentAddress: Address =
      '0x1111111111111111111111111111111111111111';
    const mockGetRefill = jest.fn().mockReturnValue({
      [differentAddress]: {
        [AddressZero]: '1000000000000000000',
      },
    } as AddressBalanceRecord);
    const result = getInitialDepositForMasterSafe(
      walletChainId,
      DEFAULT_SAFE_ADDRESS,
      [DEFAULT_SERVICE_CONFIG_ID],
      mockGetRefill,
    );
    expect(result).toEqual({});
  });

  it('computes XDAI deposit from native gas requirement (AddressZero)', () => {
    const xdaiAmount = '2000000000000000000'; // 2 XDAI
    const mockGetRefill = jest.fn().mockReturnValue({
      [DEFAULT_SAFE_ADDRESS]: {
        [AddressZero]: xdaiAmount,
      },
    } as AddressBalanceRecord);
    const result = getInitialDepositForMasterSafe(
      walletChainId,
      DEFAULT_SAFE_ADDRESS,
      [DEFAULT_SERVICE_CONFIG_ID],
      mockGetRefill,
    );
    expect(result).toEqual({
      [TokenSymbolMap.XDAI]: { amount: 2 },
    });
  });

  it('computes OLAS deposit from ERC20 requirement', () => {
    const olasAmount = '500000000000000000000'; // 500 OLAS
    const mockGetRefill = jest.fn().mockReturnValue({
      [DEFAULT_SAFE_ADDRESS]: {
        [GNOSIS_OLAS_ADDRESS]: olasAmount,
      },
    } as AddressBalanceRecord);
    const result = getInitialDepositForMasterSafe(
      walletChainId,
      DEFAULT_SAFE_ADDRESS,
      [DEFAULT_SERVICE_CONFIG_ID],
      mockGetRefill,
    );
    expect(result).toEqual({
      [TokenSymbolMap.OLAS]: { amount: 500 },
    });
  });

  it('computes both XDAI and OLAS deposits together', () => {
    const mockGetRefill = jest.fn().mockReturnValue({
      [DEFAULT_SAFE_ADDRESS]: {
        [AddressZero]: '1000000000000000000', // 1 XDAI
        [GNOSIS_OLAS_ADDRESS]: '500000000000000000000', // 500 OLAS
      },
    } as AddressBalanceRecord);
    const result = getInitialDepositForMasterSafe(
      walletChainId,
      DEFAULT_SAFE_ADDRESS,
      [DEFAULT_SERVICE_CONFIG_ID],
      mockGetRefill,
    );
    expect(result).toEqual({
      [TokenSymbolMap.XDAI]: { amount: 1 },
      [TokenSymbolMap.OLAS]: { amount: 500 },
    });
  });

  it('skips unknown token addresses not in chain config', () => {
    const unknownToken: Address = '0x0000000000000000000000000000000000000001';
    const mockGetRefill = jest.fn().mockReturnValue({
      [DEFAULT_SAFE_ADDRESS]: {
        [unknownToken]: '9999999999999999999',
        [AddressZero]: '3000000000000000000', // 3 XDAI
      },
    } as AddressBalanceRecord);
    const result = getInitialDepositForMasterSafe(
      walletChainId,
      DEFAULT_SAFE_ADDRESS,
      [DEFAULT_SERVICE_CONFIG_ID],
      mockGetRefill,
    );
    expect(result).toEqual({
      [TokenSymbolMap.XDAI]: { amount: 3 },
    });
  });

  it('skips zero-amount requirements', () => {
    const mockGetRefill = jest.fn().mockReturnValue({
      [DEFAULT_SAFE_ADDRESS]: {
        [AddressZero]: '0', // 0 XDAI
        [GNOSIS_OLAS_ADDRESS]: '100000000000000000000', // 100 OLAS
      },
    } as AddressBalanceRecord);
    const result = getInitialDepositForMasterSafe(
      walletChainId,
      DEFAULT_SAFE_ADDRESS,
      [DEFAULT_SERVICE_CONFIG_ID],
      mockGetRefill,
    );
    // XDAI is 0 => formatUnitsToNumber returns 0 => skipped
    expect(result).toEqual({
      [TokenSymbolMap.OLAS]: { amount: 100 },
    });
  });

  it('accumulates BigInt amounts across multiple serviceConfigIds', () => {
    const service1Refill: AddressBalanceRecord = {
      [DEFAULT_SAFE_ADDRESS]: {
        [AddressZero]: '1000000000000000000', // 1 XDAI
        [GNOSIS_OLAS_ADDRESS]: '200000000000000000000', // 200 OLAS
      },
    };
    const service2Refill: AddressBalanceRecord = {
      [DEFAULT_SAFE_ADDRESS]: {
        [AddressZero]: '2500000000000000000', // 2.5 XDAI
        [GNOSIS_OLAS_ADDRESS]: '300000000000000000000', // 300 OLAS
      },
    };
    const mockGetRefill = jest
      .fn()
      .mockImplementation(
        (
          _chainId: EvmChainId,
          serviceConfigId?: string,
        ): Maybe<AddressBalanceRecord> => {
          if (serviceConfigId === DEFAULT_SERVICE_CONFIG_ID)
            return service1Refill;
          if (serviceConfigId === MOCK_SERVICE_CONFIG_ID_2)
            return service2Refill;
          return undefined;
        },
      );
    const result = getInitialDepositForMasterSafe(
      walletChainId,
      DEFAULT_SAFE_ADDRESS,
      [DEFAULT_SERVICE_CONFIG_ID, MOCK_SERVICE_CONFIG_ID_2],
      mockGetRefill,
    );
    // 1 + 2.5 = 3.5 XDAI, 200 + 300 = 500 OLAS
    expect(result).toEqual({
      [TokenSymbolMap.XDAI]: { amount: 3.5 },
      [TokenSymbolMap.OLAS]: { amount: 500 },
    });
  });

  it('accumulates when only some services have refill data', () => {
    const service1Refill: AddressBalanceRecord = {
      [DEFAULT_SAFE_ADDRESS]: {
        [AddressZero]: '5000000000000000000', // 5 XDAI
      },
    };
    const mockGetRefill = jest
      .fn()
      .mockImplementation(
        (
          _chainId: EvmChainId,
          serviceConfigId?: string,
        ): Maybe<AddressBalanceRecord> => {
          if (serviceConfigId === DEFAULT_SERVICE_CONFIG_ID)
            return service1Refill;
          return undefined; // second service has no refill data
        },
      );
    const result = getInitialDepositForMasterSafe(
      walletChainId,
      DEFAULT_SAFE_ADDRESS,
      [DEFAULT_SERVICE_CONFIG_ID, MOCK_SERVICE_CONFIG_ID_2],
      mockGetRefill,
    );
    expect(result).toEqual({
      [TokenSymbolMap.XDAI]: { amount: 5 },
    });
  });

  it('matches masterSafeAddress case-insensitively', () => {
    const lowerCaseSafe = DEFAULT_SAFE_ADDRESS.toLowerCase() as Address;
    const mockGetRefill = jest.fn().mockReturnValue({
      [lowerCaseSafe]: {
        [AddressZero]: '1000000000000000000',
      },
    } as AddressBalanceRecord);
    const result = getInitialDepositForMasterSafe(
      walletChainId,
      DEFAULT_SAFE_ADDRESS,
      [DEFAULT_SERVICE_CONFIG_ID],
      mockGetRefill,
    );
    expect(result).toEqual({
      [TokenSymbolMap.XDAI]: { amount: 1 },
    });
  });

  it('passes walletChainId to getRefillRequirementsOf', () => {
    const mockGetRefill = jest.fn().mockReturnValue(undefined);
    getInitialDepositForMasterSafe(
      EvmChainIdMap.Base,
      DEFAULT_SAFE_ADDRESS,
      [DEFAULT_SERVICE_CONFIG_ID, MOCK_SERVICE_CONFIG_ID_2],
      mockGetRefill,
    );
    expect(mockGetRefill).toHaveBeenCalledTimes(2);
    expect(mockGetRefill).toHaveBeenCalledWith(
      EvmChainIdMap.Base,
      DEFAULT_SERVICE_CONFIG_ID,
    );
    expect(mockGetRefill).toHaveBeenCalledWith(
      EvmChainIdMap.Base,
      MOCK_SERVICE_CONFIG_ID_2,
    );
  });

  it('returns an empty object with an empty serviceConfigIds array', () => {
    const mockGetRefill = jest.fn();
    const result = getInitialDepositForMasterSafe(
      walletChainId,
      DEFAULT_SAFE_ADDRESS,
      [],
      mockGetRefill,
    );
    expect(result).toEqual({});
    expect(mockGetRefill).not.toHaveBeenCalled();
  });

  it('handles fractional wei amounts with correct decimal precision', () => {
    // 1.123456 XDAI = 1123456000000000000 wei
    const mockGetRefill = jest.fn().mockReturnValue({
      [DEFAULT_SAFE_ADDRESS]: {
        [AddressZero]: '1123456000000000000',
      },
    } as AddressBalanceRecord);
    const result = getInitialDepositForMasterSafe(
      walletChainId,
      DEFAULT_SAFE_ADDRESS,
      [DEFAULT_SERVICE_CONFIG_ID],
      mockGetRefill,
    );
    // formatUnitsToNumber with precision=6 rounds to 6 decimal places
    expect(result).toEqual({
      [TokenSymbolMap.XDAI]: { amount: 1.123456 },
    });
  });
});
