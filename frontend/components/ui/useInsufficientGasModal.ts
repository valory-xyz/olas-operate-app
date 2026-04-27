import { useCallback } from 'react';

import {
  InsufficientGasErrorBody,
  isInsufficientGasError,
} from '@/constants/errors';

import type {
  InsufficientSignerGasCase,
  InsufficientSignerGasModalProps,
} from './InsufficientSignerGasModal';

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
};

/**
 * Derives props for `InsufficientSignerGasModal` when a mutation rejects
 * with `INSUFFICIENT_SIGNER_GAS`, or `null` otherwise.
 *
 * Encapsulates the branching + narrowing + CTA wiring that is otherwise
 * repeated across every site that consumes this modal. Call sites only need
 * to:
 *
 *   const gasModalProps = useInsufficientGasModal({
 *     isError, error, caseType: 'agent-withdraw',
 *     onFund: (gasError) => { ...do Case-1 side effect... },
 *     onClose: () => setModalVisible(false),
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
}: UseInsufficientGasModalArgs): InsufficientSignerGasModalProps | null => {
  const gasError = isError && isInsufficientGasError(error) ? error : null;

  const handleFund = useCallback(() => {
    if (!gasError) return;
    onClose();
    onFund(gasError);
  }, [gasError, onFund, onClose]);

  if (!gasError) return null;

  return {
    caseType,
    chain: gasError.chain,
    prefillAmountWei: gasError.prefill_amount_wei,
    onFund: handleFund,
    onClose,
  };
};
