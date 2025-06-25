import { useCallback, useEffect, useState } from 'react';

import { BridgeCompleted } from '@/components/bridge/BridgeCompleted';
import { BridgeInProgress } from '@/components/bridge/BridgeInProgress/BridgeInProgress';
import { BridgeOnEvm } from '@/components/bridge/BridgeOnEvm/BridgeOnEvm';
import {
  BridgeRetryOutcome,
  EnabledSteps,
  GetBridgeRequirementsParams,
} from '@/components/bridge/types';
import { Pages } from '@/enums/Pages';
import { SetupScreen } from '@/enums/SetupScreen';
import { usePageState } from '@/hooks/usePageState';
import { useSetup } from '@/hooks/useSetup';
import { CrossChainTransferDetails } from '@/types/Bridge';
import { Nullable } from '@/types/Util';

const QUOTE_ID_ERROR = 'Quote ID is required for in progress state';
const TRANSFER_AMOUNTS_ERROR =
  'Transfer and receiving amounts are required for in progress state';

type BridgeState = 'depositing' | 'in_progress' | 'completed';

type BridgeProps = {
  bridgeFromDescription: string;
  showCompleteScreen?: boolean;
  getBridgeRequirementsParams: GetBridgeRequirementsParams;
  enabledStepsAfterBridging?: EnabledSteps;
};

export const Bridge = ({
  showCompleteScreen = false,
  getBridgeRequirementsParams,
  bridgeFromDescription,
  enabledStepsAfterBridging,
}: BridgeProps) => {
  const { goto } = usePageState();
  const { goto: gotoSetup } = useSetup();

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

  const handlePrevStep = useCallback(() => {
    gotoSetup(SetupScreen.SetupEoaFunding);
  }, [gotoSetup]);

  const handleNextStep = useCallback(() => {
    switch (bridgeState) {
      case 'depositing':
        setBridgeState('in_progress');
        break;
      case 'in_progress': {
        if (showCompleteScreen) {
          setBridgeState('completed');
        } else {
          goto(Pages.Main);
        }
        break;
      }
      case 'completed':
        goto(Pages.Main);
        break;
      default:
        throw new Error('Invalid bridge state');
    }
  }, [showCompleteScreen, bridgeState, goto]);

  switch (bridgeState) {
    case 'depositing':
      return (
        <BridgeOnEvm
          bridgeFromDescription={bridgeFromDescription}
          getBridgeRequirementsParams={getBridgeRequirementsParams}
          updateQuoteId={updateQuoteId}
          updateCrossChainTransferDetails={updateCrossChainTransferDetails}
          onPrev={handlePrevStep}
          onNext={handleNextStep}
        />
      );
    case 'in_progress': {
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
        />
      );
    }
    case 'completed':
      if (!transferAndReceivingDetails) throw new Error(TRANSFER_AMOUNTS_ERROR);
      return <BridgeCompleted {...transferAndReceivingDetails} />;
    default:
      throw new Error('Invalid bridge state!');
  }
};
