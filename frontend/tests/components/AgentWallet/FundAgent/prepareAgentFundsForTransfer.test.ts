import { prepareAgentFundsForTransfer } from '../../../../components/AgentWallet/FundAgent/ConfirmTransfer';
import { AddressZero } from '../../../../constants/address';
import { MiddlewareChainMap } from '../../../../constants/chains';
import { Address } from '../../../../types/Address';
import {
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
} from '../../../helpers/factories';

// Gnosis OLAS (ERC20) — used to assert the ERC20 split path.
const GNOSIS_OLAS_ADDRESS =
  '0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f' as Address;

describe('prepareAgentFundsForTransfer', () => {
  const baseArgs = {
    middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
    serviceSafe: { address: DEFAULT_SAFE_ADDRESS as Address },
    serviceEoa: { address: DEFAULT_EOA_ADDRESS as Address },
  };

  const eoaFunds = (result: ReturnType<typeof prepareAgentFundsForTransfer>) =>
    result[MiddlewareChainMap.GNOSIS]![DEFAULT_EOA_ADDRESS as Address];
  const safeFunds = (result: ReturnType<typeof prepareAgentFundsForTransfer>) =>
    result[MiddlewareChainMap.GNOSIS]![DEFAULT_SAFE_ADDRESS as Address];

  describe('native gas (default split, forceEoaOnly=false)', () => {
    it('routes native excess to the EOA when the Safe has no native requirement', () => {
      // Optimus-like: Safe wants 0 native. User funds 1 XDAI, EOA needs 0.3.
      const result = prepareAgentFundsForTransfer({
        ...baseArgs,
        fundsToTransfer: { XDAI: { amount: 1 } },
        eoaTokenRequirements: { [AddressZero]: '300000000000000000' },
        safeTokenRequirements: {},
      });

      // Entire 1 XDAI lands on the signer EOA; nothing strands in the Safe.
      expect(eoaFunds(result)?.[AddressZero]).toBe('1000000000000000000');
      expect(safeFunds(result)).toBeUndefined();
    });

    it('splits native by per-wallet requirement and routes the excess to the EOA', () => {
      // Trader-like: EOA needs 0.2, Safe needs 0.8. User over-funds 1.5 XDAI.
      const result = prepareAgentFundsForTransfer({
        ...baseArgs,
        fundsToTransfer: { XDAI: { amount: 1.5 } },
        eoaTokenRequirements: { [AddressZero]: '200000000000000000' },
        safeTokenRequirements: { [AddressZero]: '800000000000000000' },
      });

      // Safe gets exactly its requirement (0.8); EOA gets 0.2 + 0.5 excess = 0.7.
      expect(eoaFunds(result)?.[AddressZero]).toBe('700000000000000000');
      expect(safeFunds(result)?.[AddressZero]).toBe('800000000000000000');
    });

    it('honours both requirements exactly when funded with the combined amount (no excess)', () => {
      const result = prepareAgentFundsForTransfer({
        ...baseArgs,
        fundsToTransfer: { XDAI: { amount: 1 } },
        eoaTokenRequirements: { [AddressZero]: '200000000000000000' },
        safeTokenRequirements: { [AddressZero]: '800000000000000000' },
      });

      expect(eoaFunds(result)?.[AddressZero]).toBe('200000000000000000');
      expect(safeFunds(result)?.[AddressZero]).toBe('800000000000000000');
    });

    it('sends everything to the EOA when funded below the EOA requirement', () => {
      const result = prepareAgentFundsForTransfer({
        ...baseArgs,
        fundsToTransfer: { XDAI: { amount: 0.1 } },
        eoaTokenRequirements: { [AddressZero]: '300000000000000000' },
        safeTokenRequirements: { [AddressZero]: '800000000000000000' },
      });

      expect(eoaFunds(result)?.[AddressZero]).toBe('100000000000000000');
      expect(safeFunds(result)).toBeUndefined();
    });

    it('routes all native to the EOA when no requirements are available', () => {
      const result = prepareAgentFundsForTransfer({
        ...baseArgs,
        fundsToTransfer: { XDAI: { amount: 1 } },
        eoaTokenRequirements: {},
        safeTokenRequirements: {},
      });

      expect(eoaFunds(result)?.[AddressZero]).toBe('1000000000000000000');
      expect(safeFunds(result)).toBeUndefined();
    });
  });

  describe('ERC20 tokens (always remainder to Safe)', () => {
    it('routes the ERC20 remainder (requirement + excess) to the Safe', () => {
      const result = prepareAgentFundsForTransfer({
        ...baseArgs,
        fundsToTransfer: { OLAS: { amount: 1 } },
        eoaTokenRequirements: {},
        safeTokenRequirements: {},
      });

      expect(eoaFunds(result)).toBeUndefined();
      expect(safeFunds(result)?.[GNOSIS_OLAS_ADDRESS]).toBe(
        '1000000000000000000',
      );
    });

    it('funds the EOA up to its ERC20 requirement, remainder to the Safe', () => {
      const result = prepareAgentFundsForTransfer({
        ...baseArgs,
        fundsToTransfer: { OLAS: { amount: 1 } },
        eoaTokenRequirements: { [GNOSIS_OLAS_ADDRESS]: '400000000000000000' },
        safeTokenRequirements: {},
      });

      expect(eoaFunds(result)?.[GNOSIS_OLAS_ADDRESS]).toBe(
        '400000000000000000',
      );
      expect(safeFunds(result)?.[GNOSIS_OLAS_ADDRESS]).toBe(
        '600000000000000000',
      );
    });
  });

  describe('forceEoaOnly=true (gas-error entry)', () => {
    it('routes all native gas to the EOA even when the Safe has a native requirement', () => {
      const result = prepareAgentFundsForTransfer({
        ...baseArgs,
        fundsToTransfer: { XDAI: { amount: 1 } },
        eoaTokenRequirements: { [AddressZero]: '200000000000000000' },
        safeTokenRequirements: { [AddressZero]: '800000000000000000' },
        forceEoaOnly: true,
      });

      expect(eoaFunds(result)?.[AddressZero]).toBe('1000000000000000000');
      expect(safeFunds(result)).toBeUndefined();
    });

    it('routes all native gas to the EOA when eoaTokenRequirements reports 0', () => {
      const result = prepareAgentFundsForTransfer({
        ...baseArgs,
        fundsToTransfer: { XDAI: { amount: 1 } },
        eoaTokenRequirements: {},
        safeTokenRequirements: {},
        forceEoaOnly: true,
      });

      expect(eoaFunds(result)?.[AddressZero]).toBe('1000000000000000000');
      expect(safeFunds(result)).toBeUndefined();
    });

    it('still sends the ERC20 remainder to the Safe', () => {
      const result = prepareAgentFundsForTransfer({
        ...baseArgs,
        fundsToTransfer: { OLAS: { amount: 1 } },
        eoaTokenRequirements: {},
        safeTokenRequirements: {},
        forceEoaOnly: true,
      });

      expect(eoaFunds(result)).toBeUndefined();
      expect(safeFunds(result)?.[GNOSIS_OLAS_ADDRESS]).toBe(
        '1000000000000000000',
      );
    });
  });
});
