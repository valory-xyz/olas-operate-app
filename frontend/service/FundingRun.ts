import { BACKEND_URL, CONTENT_TYPE_JSON_UTF8 } from '@/constants';
import {
  CreateFundingRunRequest,
  FundingRun,
  FundingRunSources,
} from '@/types/FundingRun';

/** Carries the HTTP status so callers can tell a 409 (another run is live) apart. */
export class FundingRunRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'FundingRunRequestError';
  }
}

const FUNDING_RUN_URL = `${BACKEND_URL}/funding_run`;

const handleResponse = async <T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> => {
  if (response.ok) return response.json();
  const text = await response.text();
  let errorMsg: string;
  try {
    errorMsg = JSON.parse(text)?.error ?? fallbackMessage;
  } catch {
    errorMsg = fallbackMessage;
  }
  throw new FundingRunRequestError(errorMsg, response.status);
};

const getSources = async (): Promise<FundingRunSources> =>
  fetch(`${FUNDING_RUN_URL}/sources`, {
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  })
    .then((response) =>
      handleResponse<{ sources: FundingRunSources }>(
        response,
        'Failed to fetch funding sources',
      ),
    )
    .then(({ sources }) => sources);

/** The live run, a run completed moments ago, or `null`. */
const getActive = async (): Promise<FundingRun | null> =>
  fetch(`${FUNDING_RUN_URL}/active`, {
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then((response) =>
    handleResponse<FundingRun | null>(
      response,
      'Failed to fetch the active funding run',
    ),
  );

/** Creates a run, or replaces one still awaiting its deposit. */
const create = async (request: CreateFundingRunRequest): Promise<FundingRun> =>
  fetch(FUNDING_RUN_URL, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify(request),
  }).then((response) =>
    handleResponse<FundingRun>(response, 'Failed to create the funding run'),
  );

const refreshQuote = async (id: string, force = true): Promise<FundingRun> =>
  fetch(`${FUNDING_RUN_URL}/${id}/refresh_quote`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify({ force }),
  }).then((response) =>
    handleResponse<FundingRun>(response, 'Failed to refresh the quote'),
  );

const retry = async (id: string): Promise<FundingRun> =>
  fetch(`${FUNDING_RUN_URL}/${id}/retry`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then((response) =>
    handleResponse<FundingRun>(response, 'Failed to retry the funding run'),
  );

const cancel = async (id: string): Promise<FundingRun> =>
  fetch(`${FUNDING_RUN_URL}/${id}`, {
    method: 'DELETE',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then((response) =>
    handleResponse<FundingRun>(response, 'Failed to cancel the funding run'),
  );

export const FundingRunService = {
  getSources,
  getActive,
  create,
  refreshQuote,
  retry,
  cancel,
};
