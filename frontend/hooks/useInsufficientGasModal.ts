import { useCallback, useMemo } from 'react';

import type {
  InsufficientSignerGasCase,
  InsufficientSignerGasModalProps,
} from '@/components/ui/InsufficientSignerGasModal';
import {
  InsufficientGasErrorBody,
  isInsufficientGasError,
} from '@/constants/errors';
import { asEvmChainId } from '@/utils/middlewareHelpers';

type UseInsufficientGasModalArgs = {
  /** Mutation `isError` flag. The hook only narrows when this is true. */
  isError: boolean;
  /** Mutation error (typed as `unknown` by TanStack). */
  error: unknown;
  /** Which case the host site belongs to. Drives modal copy + CTA. */
  caseType: InsufficientSignerGasCase;
  /**
   * Side effect to run when the user clicks the Fund CTA. Receives the
   * narrowed gas-error body so the caller can read `prefill_amount_wei` /
   * `chain`. The hook closes the host modal (via `onClose`) before invoking
   * this callback.
   */
  onFund: (gasError: InsufficientGasErrorBody) => void;
  /**
   * Dismiss handler for both the gas modal's close button and the Fund CTA
   * (called before `onFund` runs). Typically sets the host's modal-visible
   * state to false.
   */
  onClose: () => void;
  /**
   * Optional: TanStack Query's `mutation.reset`. When provided, the hook
   * invokes it as part of the dismiss path so a stale `INSUFFICIENT_SIGNER_GAS`
   * error doesn't re-trigger the gas modal on the user's next attempt. (Hosts
   * that reopen their host modal without going through `mutateAsync` again
   * — e.g. PearlWallet's address → password flow — need this to retry cleanly.)
   */
  resetMutation?: () => void;
};

/**
 * Derives props for `InsufficientSignerGasModal` when a mutation rejects
 * with `INSUFFICIENT_SIGNER_GAS`, or `null` otherwise. Returns `null` (i.e.
 * the host should fall back to its generic failure modal) when:
 *   - the mutation isn't in error state, or
 *   - the rejection isn't an `INSUFFICIENT_SIGNER_GAS` body, or
 *   - the backend's `chain` value is unknown / unsupported on the frontend
 *     (rather than rendering a modal with an empty native-token symbol).
 *
 * Usage:
 *
 *   const gasModalProps = useInsufficientGasModal({
 *     isError, error, caseType: 'agent-withdraw',
 *     onFund: (gasError) => { ...do Case-1 side effect... },
 *     onClose: () => setModalVisible(false),
 *     resetMutation: mutation.reset,
 *   });
 *
 *   {modalVisible && (gasModalProps
 *     ? <InsufficientSignerGasModal {...gasModalProps} />
 *     : <GenericFailureModal ... />)}
 */
export const useInsufficientGasModal = ({
  isError,
  error,
  caseType,
  onFund,
  onClose,
  resetMutation,
}: UseInsufficientGasModalArgs): InsufficientSignerGasModalProps | null => {
  const gasError =
    isError && isInsufficientGasError(error) && isSupportedChain(error.chain)
      ? error
      : null;

  const handleClose = useCallback(() => {
    onClose();
    resetMutation?.();
  }, [onClose, resetMutation]);

  const handleFund = useCallback(() => {
    if (!gasError) return;
    handleClose();
    onFund(gasError);
  }, [gasError, onFund, handleClose]);

  return useMemo(() => {
    if (!gasError) return null;
    return {
      caseType,
      chain: gasError.chain,
      prefillAmountWei: gasError.prefill_amount_wei,
      onFund: handleFund,
      onClose: handleClose,
    };
  }, [gasError, caseType, handleFund, handleClose]);
};

const isSupportedChain = (chain: string): boolean => {
  try {
    asEvmChainId(chain);
    return true;
  } catch {
    return false;
  }
};
