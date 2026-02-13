import { useCallback, useEffect, useState } from 'react';

import { MiddlewareChain, MiddlewareChainMap, PAGES } from '@/constants';
import { usePageState } from '@/hooks';
import { CrossChainTransferDetails } from '@/types/Bridge';
import { Nullable } from '@/types/Util';

import { BridgeInProgress } from './BridgeInProgress/BridgeInProgress';
import { BridgeOnEvm } from './BridgeOnEvm/BridgeOnEvm';
import {
  BridgeMode,
  BridgeRetryOutcome,
  GetBridgeRequirementsParams,
} from './types';

const QUOTE_ID_ERROR = 'Quote ID is required for in progress state';
const TRANSFER_AMOUNTS_ERROR =
  'Transfer and receiving amounts are required for in progress state';

type BridgeState = 'depositing' | 'in_progress' | 'completed';

type BridgeProps = {
  mode?: BridgeMode;
  fromChain?: MiddlewareChain;
  bridgeToChain: MiddlewareChain;
  /**
   * Function to get the bridge requirements params. We are passing the function
   * instead of just the params so that the params can be requested again, in case
   * another refill is required (In case of failures or quote changes)
   */
  getBridgeRequirementsParams: GetBridgeRequirementsParams;
  onPrevBeforeBridging: () => void;
  onBridgingCompleted?: () => void;
};

/**
 * Bridge component that handles the entire bridging flow.
 * - Manages the state of the bridging process, including depositing, in progress, and completed states.
 * - Handles retry outcomes and updates the UI accordingly.
 */
export const Bridge = ({
  mode = 'deposit',
  fromChain,
  bridgeToChain,
  getBridgeRequirementsParams,
  onPrevBeforeBridging,
  onBridgingCompleted,
}: BridgeProps) => {
  const { goto } = usePageState();

  // Default to ethereum if not specified for backward compatibility
  const resolvedFromChain = fromChain || MiddlewareChainMap.ETHEREUM;

  const [bridgeState, setBridgeState] = useState<BridgeState>('depositing');
  const [quoteId, setQuoteId] = useState<Nullable<string>>(null);
  const [transferAndReceivingDetails, setTransferAndReceivingAmounts] =
    useState<Nullable<CrossChainTransferDetails>>(null);
  const [bridgeRetryOutcome, setBridgeRetryOutcome] =
    useState<Nullable<BridgeRetryOutcome>>(null);

  // If retry outcome is set, we need to update the bridge states
  useEffect(() => {
    if (!bridgeRetryOutcome) return;

    switch (bridgeRetryOutcome) {
      case 'NEED_REFILL': {
        setBridgeState('depositing');
        setQuoteId(null);
        setTransferAndReceivingAmounts(null);
        setBridgeRetryOutcome(null);
        break;
      }
      default:
        break;
    }
  }, [bridgeRetryOutcome]);

  useEffect(() => {
    if (bridgeState === 'completed') {
      onBridgingCompleted?.();
    }
  }, [bridgeState, onBridgingCompleted]);

  const updateQuoteId = useCallback(
    (quoteId: string) => setQuoteId(quoteId),
    [setQuoteId],
  );

  const updateCrossChainTransferDetails = useCallback(
    (details: CrossChainTransferDetails) =>
      setTransferAndReceivingAmounts(details),
    [setTransferAndReceivingAmounts],
  );

  const handleNextStep = useCallback(() => {
    switch (bridgeState) {
      case 'depositing':
        setBridgeState('in_progress');
        break;
      case 'in_progress': {
        setBridgeState('completed');
        break;
      }
      case 'completed':
        goto(PAGES.Main);
        break;
      default:
        throw new Error('Invalid bridge state');
    }
  }, [bridgeState, goto]);

  switch (true) {
    case bridgeState === 'depositing':
      return (
        <BridgeOnEvm
          fromChain={resolvedFromChain}
          bridgeToChain={bridgeToChain}
          getBridgeRequirementsParams={getBridgeRequirementsParams}
          updateQuoteId={updateQuoteId}
          updateCrossChainTransferDetails={updateCrossChainTransferDetails}
          onPrev={onPrevBeforeBridging}
          onNext={handleNextStep}
        />
      );
    /**
     * Shows the same component for in_progress and completed states,
     * The parent component should take care of handling the logic post completion
     * eg: For showing completion modal, redirecting etc.
     */
    case bridgeState === 'in_progress':
    case bridgeState === 'completed': {
      if (!quoteId) throw new Error(QUOTE_ID_ERROR);
      if (!transferAndReceivingDetails) throw new Error(TRANSFER_AMOUNTS_ERROR);
      return (
        <BridgeInProgress
          quoteId={quoteId}
          {...transferAndReceivingDetails}
          bridgeRetryOutcome={bridgeRetryOutcome}
          onBridgeRetryOutcome={(e: Nullable<BridgeRetryOutcome>) =>
            setBridgeRetryOutcome(e)
          }
          onNext={handleNextStep}
          areAllStepsCompleted={bridgeState === 'completed'}
          mode={mode}
        />
      );
    }
    default:
      throw new Error('Invalid bridge state!');
  }
};
