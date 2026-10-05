import { FUNDING_REQUEST_API_URL } from '../../constants/urls';
import {
  FundingRequestPayload,
  FundingRequestService,
} from '../../service/FundingRequest';

const TOKEN_REQUEST: FundingRequestPayload = {
  submissionId: '9f1c2b7e-5a3d-4f2e-8c11-6b0d7a4e93f5',
  kind: 'token',
  requestedName: 'DAI',
  contextChain: 'base',
};

const mockResponse = (status: number, body: unknown) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);

beforeEach(() => {
  global.fetch = jest.fn();
});

describe('FundingRequestService.submit', () => {
  it('posts only the payload fields to pearl-api', async () => {
    (fetch as jest.Mock).mockReturnValue(mockResponse(200, { ok: true }));

    await FundingRequestService.submit(TOKEN_REQUEST);

    expect(fetch).toHaveBeenCalledWith(FUNDING_REQUEST_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TOKEN_REQUEST),
    });
  });

  it('reports success on 2xx and does not retry', async () => {
    (fetch as jest.Mock).mockReturnValue(mockResponse(200, { ok: true }));

    await expect(FundingRequestService.submit(TOKEN_REQUEST)).resolves.toEqual({
      success: true,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('reports the API message on a non-2xx response', async () => {
    (fetch as jest.Mock).mockReturnValue(
      mockResponse(502, { error: 'Bad gateway' }),
    );

    await expect(FundingRequestService.submit(TOKEN_REQUEST)).resolves.toEqual({
      success: false,
      error: 'Bad gateway',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('reports a network failure without throwing', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('offline'));

    await expect(FundingRequestService.submit(TOKEN_REQUEST)).resolves.toEqual({
      success: false,
      error: 'offline',
    });
  });
});
