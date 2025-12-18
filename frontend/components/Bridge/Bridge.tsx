import { useCallback, useEffect, useState } from 'react';

import { MiddlewareChain, PAGES } from '@/constants';
import { usePageState } from '@/hooks';
import { CrossChainTransferDetails } from '@/types/Bridge';
import { Nullable } from '@/types/Util';

import { BridgeInProgress } from './BridgeInProgress/BridgeInProgress';
import { BridgeOnEvm } from './BridgeOnEvm/BridgeOnEvm';
import {
  BridgeRetryOutcome,
  EnabledSteps,
  GetBridgeRequirementsParams,
} from './types';

const QUOTE_ID_ERROR = 'Quote ID is required for in progress state';
const TRANSFER_AMOUNTS_ERROR =
  'Transfer and receiving amounts are required for in progress state';

type BridgeState = 'depositing' | 'in_progress' | 'completed';

type BridgeProps = {
  showCompleteScreen?: {
    completionMessage: string;
    onComplete?: () => void;
  } | null;
  getBridgeRequirementsParams: GetBridgeRequirementsParams;
  enabledStepsAfterBridging?: EnabledSteps;
  onPrevBeforeBridging: () => void;
  isOnboarding?: boolean;
  bridgeToChain: MiddlewareChain;
};

/**
 * Bridge component that handles the entire bridging flow.
 * - Manages the state of the bridging process, including depositing, in progress, and completed states.
 * - Handles retry outcomes and updates the UI accordingly.
 */
export const Bridge = ({
  showCompleteScreen,
  getBridgeRequirementsParams,
  enabledStepsAfterBridging,
  onPrevBeforeBridging,
  isOnboarding = false,
  bridgeToChain,
}: BridgeProps) => {
  const { goto } = usePageState();

  const [bridgeState, setBridgeState] = useState<BridgeState>('depositing');
  const [quoteId, setQuoteId] = useState<Nullable<string>>(null);
  const [transferAndReceivingDetails, setTransferAndReceivingAmounts] =
    useState<Nullable<CrossChainTransferDetails>>(null);
  const [bridgeRetryOutcome, setBridgeRetryOutcome] =
    useState<Nullable<BridgeRetryOutcome>>(null);

  // If retry outcome is set, we need to update the bridge state
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
        if (showCompleteScreen || isOnboarding) {
          setBridgeState('completed');
        } else {
          goto(PAGES.Main);
        }
        break;
      }
      case 'completed':
        goto(PAGES.Main);
        break;
      default:
        throw new Error('Invalid bridge state');
    }
  }, [bridgeState, goto, isOnboarding, showCompleteScreen]);

  switch (true) {
    case bridgeState === 'depositing':
      return (
        <BridgeOnEvm
          bridgeToChain={bridgeToChain}
          getBridgeRequirementsParams={getBridgeRequirementsParams}
          updateQuoteId={updateQuoteId}
          updateCrossChainTransferDetails={updateCrossChainTransferDetails}
          onPrev={onPrevBeforeBridging}
          onNext={handleNextStep}
        />
      );
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
          enabledStepsAfterBridging={enabledStepsAfterBridging}
          onNext={handleNextStep}
          isBridgeCompleted={bridgeState === 'completed'}
          isOnboarding={isOnboarding}
        />
      );
    }
    default:
      throw new Error('Invalid bridge state!');
  }
};
