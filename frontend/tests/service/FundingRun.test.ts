import { CONTENT_TYPE_JSON_UTF8 } from '../../constants/headers';
import { BACKEND_URL } from '../../constants/urls';
import {
  FundingRunRequestError,
  FundingRunService,
} from '../../service/FundingRun';
import { CreateFundingRunRequest } from '../../types/FundingRun';
import { FUNDING_RUN_BASE_USDC, makeFundingRun } from '../helpers/factories';

const RUN_URL = `${BACKEND_URL}/funding_run`;
const RUN = makeFundingRun();

const mockResponse = (body: unknown, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () =>
      Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } as Response);

beforeEach(() => {
  global.fetch = jest.fn();
});

describe('FundingRunService', () => {
  it('getSources unwraps the sources matrix', async () => {
    const sources = { base: [FUNDING_RUN_BASE_USDC] };
    (fetch as jest.Mock).mockReturnValue(mockResponse({ sources }));

    await expect(FundingRunService.getSources()).resolves.toEqual(sources);
    expect(fetch).toHaveBeenCalledWith(`${RUN_URL}/sources`, {
      headers: { ...CONTENT_TYPE_JSON_UTF8 },
    });
  });

  it('getActive returns null when no run is live', async () => {
    (fetch as jest.Mock).mockReturnValue(mockResponse(null));

    await expect(FundingRunService.getActive()).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledWith(`${RUN_URL}/active`, {
      headers: { ...CONTENT_TYPE_JSON_UTF8 },
    });
  });

  it('create posts the request body', async () => {
    (fetch as jest.Mock).mockReturnValue(mockResponse(RUN));
    const request: CreateFundingRunRequest = {
      mode: 'deposit',
      source: { chain: 'base', token: FUNDING_RUN_BASE_USDC },
      destination: { chain: 'gnosis' },
      deposit_amounts: {
        '0x0000000000000000000000000000000000000000': '1000',
      },
    };

    await expect(FundingRunService.create(request)).resolves.toEqual(RUN);
    expect(fetch).toHaveBeenCalledWith(RUN_URL, {
      method: 'POST',
      headers: { ...CONTENT_TYPE_JSON_UTF8 },
      body: JSON.stringify(request),
    });
  });

  it('refreshQuote posts force to the run route', async () => {
    (fetch as jest.Mock).mockReturnValue(mockResponse(RUN));

    await FundingRunService.refreshQuote(RUN.id, true);
    expect(fetch).toHaveBeenCalledWith(`${RUN_URL}/${RUN.id}/refresh_quote`, {
      method: 'POST',
      headers: { ...CONTENT_TYPE_JSON_UTF8 },
      body: JSON.stringify({ force: true }),
    });
  });

  it('retry posts to the run route', async () => {
    (fetch as jest.Mock).mockReturnValue(mockResponse(RUN));

    await FundingRunService.retry(RUN.id);
    expect(fetch).toHaveBeenCalledWith(`${RUN_URL}/${RUN.id}/retry`, {
      method: 'POST',
      headers: { ...CONTENT_TYPE_JSON_UTF8 },
    });
  });

  it('cancel deletes the run', async () => {
    (fetch as jest.Mock).mockReturnValue(mockResponse(RUN));

    await FundingRunService.cancel(RUN.id);
    expect(fetch).toHaveBeenCalledWith(`${RUN_URL}/${RUN.id}`, {
      method: 'DELETE',
      headers: { ...CONTENT_TYPE_JSON_UTF8 },
    });
  });

  it('throws the backend message with its status on a 409', async () => {
    (fetch as jest.Mock).mockReturnValue(
      mockResponse(
        { error: 'Funding run conflicts with the current run state.' },
        409,
      ),
    );

    const error = await FundingRunService.retry(RUN.id).catch((e) => e);
    expect(error).toBeInstanceOf(FundingRunRequestError);
    expect(error.status).toBe(409);
    expect(error.message).toBe(
      'Funding run conflicts with the current run state.',
    );
  });

  it('falls back to a fixed message when the error body is not JSON', async () => {
    (fetch as jest.Mock).mockReturnValue(mockResponse('Bad gateway', 502));

    const error = await FundingRunService.getActive().catch((e) => e);
    expect(error.status).toBe(502);
    expect(error.message).toBe('Failed to fetch the active funding run');
  });
});
