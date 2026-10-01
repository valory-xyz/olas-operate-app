import { BACKEND_URL, CONTENT_TYPE_JSON_UTF8 } from '@/constants';
import {
  CreateFundingRunRequest,
  FundingRun,
  FundingRunSources,
} from '@/types/FundingRun';
import { parseApiError } from '@/utils/error';

const FUNDING_RUN_URL = `${BACKEND_URL}/funding_run`;

const handleResponse = async <T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> =>
  response.ok ? response.json() : parseApiError(response, fallbackMessage);

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

const create = async (request: CreateFundingRunRequest): Promise<FundingRun> =>
  fetch(FUNDING_RUN_URL, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify(request),
  }).then((response) =>
    handleResponse<FundingRun>(response, 'Failed to create the funding run'),
  );

const refreshQuote = async (id: string): Promise<FundingRun> =>
  fetch(`${FUNDING_RUN_URL}/${id}/refresh_quote`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify({ force: true }),
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
