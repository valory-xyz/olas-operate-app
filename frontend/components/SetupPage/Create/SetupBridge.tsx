import { useCallback, useState } from 'react';

import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { CrossChainTransferDetails } from '@/types/Bridge';
import { Nullable } from '@/types/Util';

import { BridgeInProgress } from './BridgeInProgress';
import { BridgeOnEvm } from './BridgeOnEvm';

type BridgeState = 'depositing' | 'in_progress';

export const SetupBridge = () => {
  const { goto } = usePageState();
  const [bridgeState, setBridgeState] = useState<BridgeState>('depositing');
  const [quoteId, setQuoteId] = useState<Nullable<string>>(null);
  const [transferAndReceivingAmounts, setTransferAndReceivingAmounts] =
    useState<Nullable<CrossChainTransferDetails>>(null);

  // only the "is_refill_required" field is true, move to next page and pass the quote_id
  // and the amount of the funds that are transferred
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
          onNext={handleNextStep}
          updateQuoteId={updateQuoteId}
          updateCrossChainTransferDetails={updateCrossChainTransferDetails}
        />
      );
    case 'in_progress': {
      if (!quoteId) {
        throw new Error('Quote ID is required for in progress state');
      }
      if (!transferAndReceivingAmounts) {
        throw new Error(
          'Transfer and receiving amounts are required for in progress state',
        );
      }
      return (
        <BridgeInProgress quoteId={quoteId} {...transferAndReceivingAmounts} />
      );
    }
    default:
      throw new Error('Invalid bridge state!');
  }
};
