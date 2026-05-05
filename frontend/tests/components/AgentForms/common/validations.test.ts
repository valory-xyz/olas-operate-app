import {
  validateGeminiApiKey,
  ValidationStatus,
} from '../../../../components/AgentForms/common/validations';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1/models?key=';
const VALID_API_KEY = 'AIzaSyA1B2C3D4E5F6G7H8I9J0';
const INVALID_API_KEY = 'bad-key-12345';

describe('validations', () => {
  describe('ValidationStatus type', () => {
    it('accepts valid, invalid, and unknown as values', () => {
      const valid: ValidationStatus = 'valid';
      const invalid: ValidationStatus = 'invalid';
      const unknown: ValidationStatus = 'unknown';
      expect(valid).toBe('valid');
      expect(invalid).toBe('invalid');
      expect(unknown).toBe('unknown');
    });
  });

  describe('validateGeminiApiKey', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
      jest.restoreAllMocks();
    });

    it('returns false for an empty string', async () => {
      const result = await validateGeminiApiKey('');
      expect(result).toBe(false);
    });

    it('returns true when the API responds with ok status', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      const result = await validateGeminiApiKey(VALID_API_KEY);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        `${GEMINI_API_URL}${VALID_API_KEY}`,
      );
    });

    it('returns false when the API responds with a non-ok status', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false });

      const result = await validateGeminiApiKey(INVALID_API_KEY);

      expect(result).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        `${GEMINI_API_URL}${INVALID_API_KEY}`,
      );
    });

    it('returns false and logs error when fetch throws a network error', async () => {
      const networkError = new Error('Network failure');
      global.fetch = jest.fn().mockRejectedValue(networkError);
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await validateGeminiApiKey(VALID_API_KEY);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error validating Gemini API key:',
        networkError,
      );
    });

    it('does not call fetch when the API key is empty', async () => {
      global.fetch = jest.fn();

      await validateGeminiApiKey('');

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
