import {
  AGENTS_FUN_FORM_STEP,
  BABYDEGEN_FORM_STEP,
  commonFieldProps,
  emailValidateMessages,
  optionalFieldProps,
  requiredFieldProps,
  requiredRules,
  validateApiKey,
  validateMessages,
  validateSlug,
} from '../../../../components/AgentForms/common/formUtils';

describe('formUtils', () => {
  describe('requiredRules', () => {
    it('contains a single rule requiring the field', () => {
      expect(requiredRules).toEqual([
        { required: true, message: 'Field is required' },
      ]);
    });
  });

  describe('validateMessages', () => {
    it('has the correct required message', () => {
      expect(validateMessages).toEqual({ required: 'Field is required' });
    });
  });

  describe('commonFieldProps', () => {
    it('includes requiredRules and hasFeedback', () => {
      expect(commonFieldProps.rules).toBe(requiredRules);
      expect(commonFieldProps.hasFeedback).toBe(true);
    });
  });

  describe('requiredFieldProps', () => {
    it('extends commonFieldProps with validateFirst and normalize', () => {
      expect(requiredFieldProps.rules).toBe(requiredRules);
      expect(requiredFieldProps.hasFeedback).toBe(true);
      expect(requiredFieldProps.validateFirst).toBe(true);
      expect(requiredFieldProps.normalize).toBeDefined();
    });

    it('normalize trims leading and trailing whitespace', () => {
      const normalize = requiredFieldProps.normalize as (
        value: string,
      ) => string;
      expect(normalize('  hello  ')).toBe('hello');
      expect(normalize('no-trim')).toBe('no-trim');
      expect(normalize('  leading')).toBe('leading');
      expect(normalize('trailing  ')).toBe('trailing');
      expect(normalize('   ')).toBe('');
    });
  });

  describe('optionalFieldProps', () => {
    it('has rules that mark the field as not required', () => {
      expect(optionalFieldProps.rules).toEqual([{ required: false }]);
    });

    it('includes validateFirst and normalize', () => {
      expect(optionalFieldProps.validateFirst).toBe(true);
      expect(optionalFieldProps.normalize).toBeDefined();
    });

    it('normalize trims whitespace', () => {
      const normalize = optionalFieldProps.normalize as (
        value: string,
      ) => string;
      expect(normalize('  spaced  ')).toBe('spaced');
      expect(normalize('clean')).toBe('clean');
    });

    it('does not include hasFeedback', () => {
      expect(optionalFieldProps.hasFeedback).toBeUndefined();
    });
  });

  describe('emailValidateMessages', () => {
    it('has the correct required and email type messages', () => {
      expect(emailValidateMessages).toEqual({
        required: 'Field is required',
        types: { email: 'Enter a valid email' },
      });
    });
  });

  describe('BABYDEGEN_FORM_STEP', () => {
    it('defines coingecko and gemini steps', () => {
      expect(BABYDEGEN_FORM_STEP.coingecko).toBe('coingecko');
      expect(BABYDEGEN_FORM_STEP.gemini).toBe('gemini');
    });

    it('has exactly two steps', () => {
      expect(Object.keys(BABYDEGEN_FORM_STEP)).toHaveLength(2);
    });
  });

  describe('AGENTS_FUN_FORM_STEP', () => {
    it('defines persona and x_account_api_tokens steps', () => {
      expect(AGENTS_FUN_FORM_STEP.persona).toBe('persona');
      expect(AGENTS_FUN_FORM_STEP.x_account_api_tokens).toBe(
        'x_account_api_tokens',
      );
    });

    it('has exactly two steps', () => {
      expect(Object.keys(AGENTS_FUN_FORM_STEP)).toHaveLength(2);
    });
  });

  describe('validateApiKey', () => {
    it('resolves when the value is undefined (defers to required rule)', async () => {
      await expect(validateApiKey(null, undefined)).resolves.toBeUndefined();
    });

    it('resolves when the value is an empty string', async () => {
      await expect(validateApiKey(null, '')).resolves.toBeUndefined();
    });

    it('rejects when the API key contains spaces', async () => {
      const keyWithSpaces = 'abc def';
      await expect(validateApiKey(null, keyWithSpaces)).rejects.toBe(
        'API Key should not contain spaces.',
      );
    });

    it('rejects when the API key contains a tab character', async () => {
      const keyWithTab = 'abc\tdef';
      await expect(validateApiKey(null, keyWithTab)).rejects.toBe(
        'API Key should not contain spaces.',
      );
    });

    it('rejects when the API key contains special characters', async () => {
      const keyWithSpecialChars = 'abc@def!';
      await expect(validateApiKey(null, keyWithSpecialChars)).rejects.toBe(
        'Invalid API Key format. Only letters, numbers, hyphens, and underscores are allowed.',
      );
    });

    it('rejects when the API key contains a dot', async () => {
      const keyWithDot = 'abc.def';
      await expect(validateApiKey(null, keyWithDot)).rejects.toBe(
        'Invalid API Key format. Only letters, numbers, hyphens, and underscores are allowed.',
      );
    });

    it('resolves for a valid alphanumeric API key', async () => {
      const validAlphanumericKey = 'abc123XYZ';
      await expect(
        validateApiKey(null, validAlphanumericKey),
      ).resolves.toBeUndefined();
    });

    it('resolves for an API key with hyphens and underscores', async () => {
      const validKeyWithHyphensAndUnderscores = 'my-api_key-123';
      await expect(
        validateApiKey(null, validKeyWithHyphensAndUnderscores),
      ).resolves.toBeUndefined();
    });
  });

  describe('validateSlug', () => {
    it('resolves when the value is undefined (defers to required rule)', async () => {
      await expect(validateSlug(null, undefined)).resolves.toBeUndefined();
    });

    it('resolves when the value is an empty string', async () => {
      await expect(validateSlug(null, '')).resolves.toBeUndefined();
    });

    it('rejects when the slug contains spaces', async () => {
      const slugWithSpaces = 'my slug';
      await expect(validateSlug(null, slugWithSpaces)).rejects.toBe(
        'Slugs cannot contain spaces.',
      );
    });

    it('rejects when the slug is a full HTTP URL', async () => {
      const httpUrl = 'http://example.com/my-slug';
      await expect(validateSlug(null, httpUrl)).rejects.toBe(
        'Please enter only the slug, not the full URL.',
      );
    });

    it('rejects when the slug is a full HTTPS URL', async () => {
      const httpsUrl = 'https://example.com/my-slug';
      await expect(validateSlug(null, httpsUrl)).rejects.toBe(
        'Please enter only the slug, not the full URL.',
      );
    });

    it('rejects when the slug contains special characters', async () => {
      const slugWithSpecialChars = 'my@slug!';
      await expect(validateSlug(null, slugWithSpecialChars)).rejects.toBe(
        'Invalid slug format. Only letters, numbers, hyphens, and underscores are allowed.',
      );
    });

    it('rejects when the slug contains a dot', async () => {
      const slugWithDot = 'my.slug';
      await expect(validateSlug(null, slugWithDot)).rejects.toBe(
        'Invalid slug format. Only letters, numbers, hyphens, and underscores are allowed.',
      );
    });

    it('resolves for a valid alphanumeric slug', async () => {
      const validAlphanumericSlug = 'mySlug123';
      await expect(
        validateSlug(null, validAlphanumericSlug),
      ).resolves.toBeUndefined();
    });

    it('resolves for a slug with hyphens and underscores', async () => {
      const validSlugWithHyphensAndUnderscores = 'my-cool_slug';
      await expect(
        validateSlug(null, validSlugWithHyphensAndUnderscores),
      ).resolves.toBeUndefined();
    });
  });
});
