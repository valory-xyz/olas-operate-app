import React from 'react';

/**
 * Shared jest mock for the `InsufficientSignerGasModal` component.
 *
 * Any test that mounts a component which branches into
 * `InsufficientSignerGasModal` should use this factory so the DOM shape and
 * test-ids stay consistent across suites. If the real modal's props change,
 * update this one helper instead of three near-identical copies.
 *
 * Usage:
 *
 *   jest.mock('../../../../components/ui', () => ({
 *     ...jest.requireActual('../../../../components/ui'),  // if you need other exports
 *     InsufficientSignerGasModal: insufficientGasModalMock,
 *   }));
 */
type InsufficientGasModalMockProps = {
  caseType: string;
  chain: string;
  prefillAmountWei: number | string;
  onFund: () => void;
  onClose: () => void;
};

export const insufficientGasModalMock = ({
  caseType,
  chain,
  prefillAmountWei,
  onFund,
  onClose,
}: InsufficientGasModalMockProps) => (
  <div data-testid="insufficient-gas-modal">
    <span data-testid="gas-modal-case">{caseType}</span>
    <span data-testid="gas-modal-chain">{chain}</span>
    <span data-testid="gas-modal-amount">{String(prefillAmountWei)}</span>
    <button data-testid="gas-modal-fund" onClick={onFund}>
      Fund
    </button>
    <button data-testid="gas-modal-close" onClick={onClose}>
      Close
    </button>
  </div>
);
