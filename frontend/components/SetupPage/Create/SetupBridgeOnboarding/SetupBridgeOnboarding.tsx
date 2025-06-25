import { useCallback, useEffect, useState } from 'react';

import { Pages } from '@/enums/Pages';
import { SetupScreen } from '@/enums/SetupScreen';
import { usePageState } from '@/hooks/usePageState';
import { useSetup } from '@/hooks/useSetup';
import { CrossChainTransferDetails } from '@/types/Bridge';
import { Nullable } from '@/types/Util';

import { BridgeInProgress } from './BridgeInProgress/BridgeInProgress';
import { BridgeOnEvm } from './BridgeOnEvm';
import { BridgeRetryOutcome } from './types';
import { useGetBridgeRequirementsParams } from './useGetBridgeRequirementsParams';

const QUOTE_ID_ERROR = 'Quote ID is required for in progress state';
const TRANSFER_AMOUNTS_ERROR =
  'Transfer and receiving amounts are required for in progress state';
const BRIDGE_FROM_MESSAGE =
  'The bridged amount covers all funds required to create your account and run your agent, including fees. No further funds will be needed.';

type BridgeState = 'depositing' | 'in_progress';

export const SetupBridgeOnboarding = () => {
  const { goto } = usePageState();
  const { goto: gotoSetup } = useSetup();
  const getBridgeRequirementsParams = useGetBridgeRequirementsParams();

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
      case 'in_progress':
        goto(Pages.Main);
        break;
      default:
        throw new Error('Invalid bridge state');
    }
  }, [bridgeState, goto]);

  switch (bridgeState) {
    case 'depositing':
      return (
        <BridgeOnEvm
          bridgeFromMessage={BRIDGE_FROM_MESSAGE}
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
        />
      );
    }
    default:
      throw new Error('Invalid bridge state!');
  }
};
