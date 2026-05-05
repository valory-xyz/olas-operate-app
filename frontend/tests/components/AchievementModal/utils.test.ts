import {
  generateXIntentUrl,
  getPredictWebsiteAchievementUrl,
} from '../../../components/AchievementModal/utils';
import {
  ACHIEVEMENT_AGENT,
  AchievementAgent,
} from '../../../constants/achievement';
import { PREDICT_WEBSITE_URL } from '../../../constants/urls';

describe('getPredictWebsiteAchievementUrl', () => {
  const agents = Object.values(ACHIEVEMENT_AGENT) as AchievementAgent[];

  it.each(agents)(
    'returns correct URL for agent "%s" with empty params',
    (agent) => {
      const params = new URLSearchParams();
      const result = getPredictWebsiteAchievementUrl(agent, params);
      expect(result).toBe(`${PREDICT_WEBSITE_URL}/${agent}/achievement/?`);
    },
  );

  it.each(agents)(
    'returns correct URL for agent "%s" with single param',
    (agent) => {
      const params = new URLSearchParams({ id: '123' });
      const result = getPredictWebsiteAchievementUrl(agent, params);
      expect(result).toBe(
        `${PREDICT_WEBSITE_URL}/${agent}/achievement/?id=123`,
      );
    },
  );

  it('includes multiple query parameters', () => {
    const params = new URLSearchParams({ id: '42', type: 'payout' });
    const result = getPredictWebsiteAchievementUrl(
      ACHIEVEMENT_AGENT.POLYSTRAT,
      params,
    );
    expect(result).toBe(
      `${PREDICT_WEBSITE_URL}/polystrat/achievement/?id=42&type=payout`,
    );
  });

  it('encodes special characters in query parameter values', () => {
    const params = new URLSearchParams({ title: 'hello world&more' });
    const result = getPredictWebsiteAchievementUrl(
      ACHIEVEMENT_AGENT.OMENSTRAT,
      params,
    );
    // URLSearchParams encodes & as %26 and space as +
    const parsed = new URL(result);
    expect(parsed.searchParams.get('title')).toBe('hello world&more');
  });

  it('returns a valid URL (no throw from new URL())', () => {
    const params = new URLSearchParams({ foo: 'bar' });
    expect(() =>
      getPredictWebsiteAchievementUrl(ACHIEVEMENT_AGENT.POLYSTRAT, params),
    ).not.toThrow();
  });
});

describe('generateXIntentUrl', () => {
  it('returns an X intent URL with plain text', () => {
    const result = generateXIntentUrl('Hello');
    expect(result).toBe('https://x.com/intent/post?text=Hello');
  });

  it('encodes spaces as %20', () => {
    const result = generateXIntentUrl('Hello World');
    expect(result).toBe('https://x.com/intent/post?text=Hello%20World');
  });

  it('encodes special characters', () => {
    const result = generateXIntentUrl('price is $100 & rising!');
    expect(result).toContain('https://x.com/intent/post?text=');
    expect(decodeURIComponent(result.split('text=')[1])).toBe(
      'price is $100 & rising!',
    );
  });

  it('encodes URLs within the text', () => {
    const text = 'Check out https://example.com?foo=bar';
    const result = generateXIntentUrl(text);
    expect(decodeURIComponent(result.split('text=')[1])).toBe(text);
  });

  it('encodes unicode characters', () => {
    const text = 'Earned 2.13x payout!';
    const result = generateXIntentUrl(text);
    expect(decodeURIComponent(result.split('text=')[1])).toBe(text);
  });

  it('encodes hashtags and at-mentions', () => {
    const text = '#OLAS @predict 100% returns';
    const result = generateXIntentUrl(text);
    expect(decodeURIComponent(result.split('text=')[1])).toBe(text);
  });

  it('encodes newlines', () => {
    const text = 'Line 1\nLine 2';
    const result = generateXIntentUrl(text);
    expect(decodeURIComponent(result.split('text=')[1])).toBe(text);
  });
});
