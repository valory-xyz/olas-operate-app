import { FUNDING_REQUEST_API_URL, MiddlewareChain } from '@/constants';
import { parseApiError } from '@/utils';

/**
 * The exact body `POST /api/feedback/funding-request` accepts. A chain request
 * carries no context; a token request names the chain it was asked for.
 */
export type FundingRequestPayload =
  | {
      submissionId: string;
      kind: 'chain';
      requestedName: string;
      contextChain: null;
    }
  | {
      submissionId: string;
      kind: 'token';
      requestedName: string;
      contextChain: MiddlewareChain;
    };

export type SubmitFundingRequestResponse =
  | { success: true }
  | { success: false; error: string };

const SUBMIT_ERROR = 'Failed to submit the request';

/** Any 2xx means accepted. No retry: the server does not dedupe, so a retry appends a row. */
const submit = async (
  payload: FundingRequestPayload,
): Promise<SubmitFundingRequestResponse> => {
  try {
    const response = await fetch(FUNDING_REQUEST_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await parseApiError(response, SUBMIT_ERROR);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : SUBMIT_ERROR,
    };
  }
};

export const FundingRequestService = { submit };
