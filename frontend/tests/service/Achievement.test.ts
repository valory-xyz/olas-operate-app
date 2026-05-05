import { CONTENT_TYPE_JSON_UTF8 } from '../../constants/headers';
import { BACKEND_URL_V2, PEARL_API_URL } from '../../constants/urls';
import {
  acknowledgeServiceAchievement,
  generateAchievementImage,
  getServiceAchievements,
} from '../../service/Achievement';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makePolystratPayoutAchievement,
  MOCK_ACHIEVEMENT_ID,
  MOCK_BET_ID,
} from '../helpers/factories';

const mockJsonResponse = (body: unknown, ok = true) =>
  Promise.resolve({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(body),
  } as Response);

beforeEach(() => {
  global.fetch = jest.fn();
  jest.restoreAllMocks();
});

const sampleAchievement = makePolystratPayoutAchievement();

describe('getServiceAchievements', () => {
  it('fetches achievements from the correct URL', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockReturnValue(mockJsonResponse([sampleAchievement]));

    const controller = new AbortController();
    await getServiceAchievements({
      serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      signal: controller.signal,
    });

    expect(fetch).toHaveBeenCalledWith(
      `${BACKEND_URL_V2}/service/${DEFAULT_SERVICE_CONFIG_ID}/achievements`,
      {
        method: 'GET',
        headers: { ...CONTENT_TYPE_JSON_UTF8 },
        signal: controller.signal,
      },
    );
  });

  it('returns parsed achievements on success', async () => {
    const achievements = [sampleAchievement];
    jest.spyOn(global, 'fetch').mockReturnValue(mockJsonResponse(achievements));

    const result = await getServiceAchievements({
      serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      signal: new AbortController().signal,
    });

    expect(result).toEqual(achievements);
  });

  it('throws error when response is not ok', async () => {
    jest.spyOn(global, 'fetch').mockReturnValue(mockJsonResponse(null, false));

    await expect(
      getServiceAchievements({
        serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow(
      `Failed to fetch service achievements for service config ${DEFAULT_SERVICE_CONFIG_ID}`,
    );
  });

  it('rejects when fetch throws a network error', async () => {
    const networkError = new Error('Network error');
    jest.spyOn(global, 'fetch').mockRejectedValue(networkError);

    await expect(
      getServiceAchievements({
        serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        signal: new AbortController().signal,
      }),
    ).rejects.toBe(networkError);
  });
});

describe('acknowledgeServiceAchievement', () => {
  const achievementId = MOCK_ACHIEVEMENT_ID;

  it('posts to the correct acknowledge URL', async () => {
    jest.spyOn(global, 'fetch').mockReturnValue(mockJsonResponse({ ok: true }));

    await acknowledgeServiceAchievement({
      serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      achievementId,
    });

    expect(fetch).toHaveBeenCalledWith(
      `${BACKEND_URL_V2}/service/${DEFAULT_SERVICE_CONFIG_ID}/achievement/${achievementId}/acknowledge`,
      {
        method: 'POST',
        headers: { ...CONTENT_TYPE_JSON_UTF8 },
      },
    );
  });

  it('returns parsed JSON on success', async () => {
    const responseBody = { acknowledged: true };
    jest.spyOn(global, 'fetch').mockReturnValue(mockJsonResponse(responseBody));

    const result = await acknowledgeServiceAchievement({
      serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      achievementId,
    });

    expect(result).toEqual(responseBody);
  });

  it('throws error when response is not ok', async () => {
    jest.spyOn(global, 'fetch').mockReturnValue(mockJsonResponse(null, false));

    await expect(
      acknowledgeServiceAchievement({
        serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        achievementId,
      }),
    ).rejects.toThrow(
      `Failed to acknowledge service achievement for service config ${DEFAULT_SERVICE_CONFIG_ID}`,
    );
  });
});

describe('generateAchievementImage', () => {
  const imageParams = { agent: 'polystrat', type: 'payout', id: MOCK_BET_ID };

  it('posts to the correct URL with query params', async () => {
    jest.spyOn(global, 'fetch').mockReturnValue(mockJsonResponse({ ok: true }));

    await generateAchievementImage(imageParams);

    const expectedQuery = new URLSearchParams(imageParams).toString();
    expect(fetch).toHaveBeenCalledWith(
      `${PEARL_API_URL}/api/achievement/generate-image?${expectedQuery}`,
      {
        method: 'POST',
        headers: { ...CONTENT_TYPE_JSON_UTF8 },
      },
    );
  });

  it('returns parsed JSON on success', async () => {
    const responseBody = { imageUrl: 'https://example.com/image.png' };
    jest.spyOn(global, 'fetch').mockReturnValue(mockJsonResponse(responseBody));

    const result = await generateAchievementImage(imageParams);
    expect(result).toEqual(responseBody);
  });

  it('throws error when response is not ok', async () => {
    jest.spyOn(global, 'fetch').mockReturnValue(mockJsonResponse(null, false));

    await expect(generateAchievementImage(imageParams)).rejects.toThrow(
      'Failed to trigger achievement image generation',
    );
  });

  it('encodes special characters in query params', async () => {
    jest.spyOn(global, 'fetch').mockReturnValue(mockJsonResponse({ ok: true }));

    const paramsWithSpecialChars = {
      agent: 'agents fun',
      type: 'pay/out',
      id: 'id=1&2',
    };
    await generateAchievementImage(paramsWithSpecialChars);

    const expectedQuery = new URLSearchParams(
      paramsWithSpecialChars,
    ).toString();
    expect(fetch).toHaveBeenCalledWith(
      `${PEARL_API_URL}/api/achievement/generate-image?${expectedQuery}`,
      expect.any(Object),
    );
  });
});
