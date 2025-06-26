import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';

import { BridgeCompleted } from '@/components/bridgeee/BridgeCompleted';
import { BridgeInProgress } from '@/components/bridgeee/BridgeInProgress/BridgeInProgress';
import { BridgeOnEvm } from '@/components/bridgeee/BridgeOnEvm/BridgeOnEvm';
import {
  BridgeRetryOutcome,
  EnabledSteps,
  GetBridgeRequirementsParams,
} from '@/components/bridgeee/types';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { CrossChainTransferDetails } from '@/types/Bridge';
import { Nullable } from '@/types/Util';

const QUOTE_ID_ERROR = 'Quote ID is required for in progress state';
const TRANSFER_AMOUNTS_ERROR =
  'Transfer and receiving amounts are required for in progress state';

type BridgeState = 'depositing' | 'in_progress' | 'completed';

const BridgePropsSchema = z
  .object({
    bridgeFromDescription: z.string(),
    showCompleteScreen: z.boolean().optional(),
    getBridgeRequirementsParams: z.custom<GetBridgeRequirementsParams>(),
    enabledStepsAfterBridging: z.custom<EnabledSteps>().optional(),
    onPrevBeforeBridging: z.function(),
    completionMessage: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    //  If showCompleteScreen is true, completionMessage  must be provided
    if (data.showCompleteScreen && !data.completionMessage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'completionMessage is required when showCompleteScreen is true',
        path: ['completionMessage'],
      });
    }
  });

type BridgeProps = z.infer<typeof BridgePropsSchema>;

/**
 * Bridge component that handles the entire bridging flow.
 * It manages the state of the bridging process, including depositing, in progress, and completed states.
 * It also handles retry outcomes and updates the UI accordingly.
 */
export const Bridge = ({
  showCompleteScreen = false,
  getBridgeRequirementsParams,
  bridgeFromDescription,
  enabledStepsAfterBridging,
  onPrevBeforeBridging,
  completionMessage,
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
          onPrev={onPrevBeforeBridging}
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
      return (
        <BridgeCompleted
          {...transferAndReceivingDetails}
          completionMessage={completionMessage}
        />
      );
    default:
      throw new Error('Invalid bridge state!');
  }
};
