import { FormItemProps } from 'antd';

export const requiredRules = [{ required: true, message: 'Field is required' }];
export const validateMessages = { required: 'Field is required' };

export const commonFieldProps: FormItemProps = {
  rules: requiredRules,
  hasFeedback: true,
} as const;

/**
 * Field properties for optional form fields. These fields are not required.
 */
const optionalCommonFieldProps: FormItemProps = {
  rules: [{ required: false }],
} as const;

export const requiredFieldProps: FormItemProps = {
  ...commonFieldProps,
  validateFirst: true,
  normalize: (value: string) => value.trim(),
} as const;

export const optionalFieldProps: FormItemProps = {
  ...optionalCommonFieldProps,
  validateFirst: true,
  normalize: (value: string) => value.trim(),
} as const;

export const emailValidateMessages = {
  required: 'Field is required',
  types: { email: 'Enter a valid email' },
} as const;

export const BABYDEGEN_FORM_STEP = {
  coingecko: 'coingecko',
  gemini: 'gemini',
} as const;

export type BabyDegenFormStep = keyof typeof BABYDEGEN_FORM_STEP;

export const AGENTS_FUN_FORM_STEP = {
  persona: 'persona',
  x_account_api_tokens: 'x_account_api_tokens',
} as const;

export type AgentsFunFormStep = keyof typeof AGENTS_FUN_FORM_STEP;

/**
 * form validator for API key.
 */
export const validateApiKey = (_: unknown, value?: string): Promise<void> => {
  if (!value) return Promise.resolve(); // If empty, let 'required' rule handle it

  // API key should not contain spaces
  if (/\s/.test(value)) {
    return Promise.reject('API Key should not contain spaces.');
  }

  // API key should only contain letters, numbers, hyphens, and underscores
  if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
    return Promise.reject(
      'Invalid API Key format. Only letters, numbers, hyphens, and underscores are allowed.',
    );
  }

  return Promise.resolve();
};

/**
 * form validator for slug.
 */
export const validateSlug = (_: unknown, value?: string): Promise<void> => {
  if (!value) return Promise.resolve(); // If empty, let 'required' rule handle it

  if (/\s/.test(value)) {
    return Promise.reject('Slugs cannot contain spaces.');
  }

  // URL should not be allowed
  if (/^https?:\/\//.test(value)) {
    return Promise.reject('Please enter only the slug, not the full URL.');
  }

  // Slug should only contain letters, numbers, hyphens, and underscores
  if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
    return Promise.reject(
      'Invalid slug format. Only letters, numbers, hyphens, and underscores are allowed.',
    );
  }

  return Promise.resolve();
};
