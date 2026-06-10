import { prepareAgentFundsForTransfer } from '../../../../components/AgentWallet/FundAgent/ConfirmTransfer';
import { AddressZero } from '../../../../constants/address';
import { MiddlewareChainMap } from '../../../../constants/chains';
import { Address } from '../../../../types/Address';
import {
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
} from '../../../helpers/factories';

describe('prepareAgentFundsForTransfer', () => {
  const baseArgs = {
    middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
    serviceSafe: { address: DEFAULT_SAFE_ADDRESS as Address },
    serviceEoa: { address: DEFAULT_EOA_ADDRESS as Address },
  };

  describe('default split (forceEoaOnly=false)', () => {
    it('allocates to EOA up to eoaTokenRequirements, remainder to safe', () => {
      const result = prepareAgentFundsForTransfer({
        ...baseArgs,
        fundsToTransfer: { XDAI: { amount: 1 } },
        eoaTokenRequirements: { [AddressZero]: '300000000000000000' },
      });

      const chainFunds = result[MiddlewareChainMap.GNOSIS]!;
      expect(chainFunds[DEFAULT_EOA_ADDRESS as Address]?.[AddressZero]).toBe(
        '300000000000000000',
      );
      expect(chainFunds[DEFAULT_SAFE_ADDRESS as Address]?.[AddressZero]).toBe(
        '700000000000000000',
      );
    });

    it('routes everything to safe when eoaTokenRequirements is empty', () => {
      const result = prepareAgentFundsForTransfer({
        ...baseArgs,
        fundsToTransfer: { XDAI: { amount: 1 } },
        eoaTokenRequirements: {},
      });

      const chainFunds = result[MiddlewareChainMap.GNOSIS]!;
      expect(chainFunds[DEFAULT_EOA_ADDRESS as Address]).toBeUndefined();
      expect(chainFunds[DEFAULT_SAFE_ADDRESS as Address]?.[AddressZero]).toBe(
        '1000000000000000000',
      );
    });
  });

  describe('forceEoaOnly=true (gas-error entry)', () => {
    it('routes all native gas to EOA even when eoaTokenRequirements reports 0', () => {
      const result = prepareAgentFundsForTransfer({
        ...baseArgs,
        fundsToTransfer: { XDAI: { amount: 1 } },
        // The polled requirements say EOA needs nothing — without
        // forceEoaOnly, this is the bug path that routes funds to the safe.
        eoaTokenRequirements: {},
        forceEoaOnly: true,
      });

      const chainFunds = result[MiddlewareChainMap.GNOSIS]!;
      expect(chainFunds[DEFAULT_EOA_ADDRESS as Address]?.[AddressZero]).toBe(
        '1000000000000000000',
      );
      expect(chainFunds[DEFAULT_SAFE_ADDRESS as Address]).toBeUndefined();
    });

    it('routes all native gas to EOA when eoaTokenRequirements reports a smaller amount', () => {
      const result = prepareAgentFundsForTransfer({
        ...baseArgs,
        fundsToTransfer: { XDAI: { amount: 1 } },
        // Even though the polled requirements say EOA needs only 0.3, the
        // user came here because the failed tx needed more — force all 1
        // XDAI to the EOA.
        eoaTokenRequirements: { [AddressZero]: '300000000000000000' },
        forceEoaOnly: true,
      });

      const chainFunds = result[MiddlewareChainMap.GNOSIS]!;
      expect(chainFunds[DEFAULT_EOA_ADDRESS as Address]?.[AddressZero]).toBe(
        '1000000000000000000',
      );
      expect(chainFunds[DEFAULT_SAFE_ADDRESS as Address]).toBeUndefined();
    });
  });
});
