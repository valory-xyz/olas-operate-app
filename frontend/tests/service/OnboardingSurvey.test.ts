import { ONBOARDING_SURVEY_API_URL } from '../../constants/urls';
import {
  OnboardingSurveyPayload,
  OnboardingSurveyService,
} from '../../service/OnboardingSurvey';

jest.mock('../../utils/error', () => ({
  ...jest.requireActual('../../utils/error'),
  parseApiError: jest.fn(),
}));

const { parseApiError: mockParseApiError } = jest.requireMock(
  '../../utils/error',
) as { parseApiError: jest.Mock };

const makePayload = (
  overrides: Partial<OnboardingSurveyPayload> = {},
): OnboardingSurveyPayload => ({
  submissionId: '9f1c2b7e-5a3d-4f2e-8c11-6b0d7a4e93f5',
  frictionAreas: ['backup_wallet', 'funding_agent'],
  rating: 2,
  comment: 'Took a while to find the deposit address.',
  os: { type: 'Darwin', platform: 'darwin', arch: 'arm64', release: '24.3.0' },
  agentType: 'polymarket_trader',
  pearlVersion: '0.9.4',
  timeToFirstSuccessSeconds: 93_600,
  timeToCompleteSurveySeconds: 42,
  ...overrides,
});

const mockResponse = (ok: boolean, status = ok ? 200 : 502) =>
  Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve({ ok }),
  } as Response);

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
  mockParseApiError.mockRejectedValue(new Error('API error'));
});

describe('OnboardingSurveyService.submit', () => {
  it('posts the payload as JSON to the survey endpoint', async () => {
    jest.spyOn(global, 'fetch').mockReturnValue(mockResponse(true));
    const payload = makePayload();

    await OnboardingSurveyService.submit(payload);

    expect(fetch).toHaveBeenCalledWith(ONBOARDING_SURVEY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  it('reports success on 2xx', async () => {
    jest.spyOn(global, 'fetch').mockReturnValue(mockResponse(true));

    await expect(
      OnboardingSurveyService.submit(makePayload()),
    ).resolves.toEqual({ success: true });
  });

  it('reports failure on a non-2xx and does not retry', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockReturnValue(mockResponse(false));

    const result = await OnboardingSurveyService.submit(makePayload());

    expect(result.success).toBe(false);
    // A retry would append a second row: pearl-api does not dedupe.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('reports failure when the request throws, without retrying', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('offline'));

    const result = await OnboardingSurveyService.submit(makePayload());

    expect(result).toEqual({ success: false, error: 'offline' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('sends timeToFirstSuccessSeconds as null rather than 0 when unavailable', async () => {
    jest.spyOn(global, 'fetch').mockReturnValue(mockResponse(true));

    await OnboardingSurveyService.submit(
      makePayload({ timeToFirstSuccessSeconds: null }),
    );

    const body = JSON.parse(
      (jest.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.timeToFirstSuccessSeconds).toBeNull();
  });

  it('sends nothing that identifies the user', async () => {
    jest.spyOn(global, 'fetch').mockReturnValue(mockResponse(true));

    await OnboardingSurveyService.submit(makePayload());

    const body = JSON.parse(
      (jest.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    // Asserting the exact key set, not the absence of a list: a new identifying
    // field added later fails here rather than silently reaching the sheet.
    expect(Object.keys(body).sort()).toEqual([
      'agentType',
      'comment',
      'frictionAreas',
      'os',
      'pearlVersion',
      'rating',
      'submissionId',
      'timeToCompleteSurveySeconds',
      'timeToFirstSuccessSeconds',
    ]);
  });
});
