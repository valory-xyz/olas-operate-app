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
export const optionalFieldProps: FormItemProps = {
  rules: [{ required: false }],
} as const;

export const modiusAgentFieldProps: FormItemProps = {
  ...commonFieldProps,
  validateFirst: true,
  normalize: (value: string) => value.trim(),
} as const;

export const modiusAgentFieldOptionalProps: FormItemProps = {
  ...optionalFieldProps,
  validateFirst: true,
  normalize: (value: string) => value.trim(),
} as const;

export const emailValidateMessages = {
  required: 'Field is required',
  types: { email: 'Enter a valid email' },
} as const;

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

  // Slug should only contain lowercase letters, numbers, hyphens, and underscores
  if (!/^[a-z0-9-_]+$/.test(value)) {
    return Promise.reject(
      'Invalid slug format. Only lowercase letters, numbers, hyphens, and underscores are allowed.',
    );
  }

  return Promise.resolve();
};
