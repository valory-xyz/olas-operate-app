export const requiredRules = [{ required: true, message: 'Field is required' }];
export const validateMessages = { required: 'Field is required' };
export const commonFieldProps = { rules: requiredRules, hasFeedback: true };

export const emailValidateMessages = {
  required: 'Field is required',
  types: { email: 'Enter a valid email' },
};

/**
 * antd validator for API key.
 */
export const validateApiKey = (_: unknown, value?: string): Promise<void> => {
  if (!value) {
    return Promise.reject('API Key is required');
  }

  const trimmedValue = value.trim();

  // API key should not contain spaces
  if (/\s/.test(trimmedValue)) {
    return Promise.reject('API Key should not contain spaces.');
  }

  // API key should only contain letters, numbers, hyphens, and underscores
  if (!/^[a-zA-Z0-9-_]+$/.test(trimmedValue)) {
    return Promise.reject(
      'Invalid API Key format. Only letters, numbers, hyphens, and underscores are allowed.',
    );
  }

  return Promise.resolve();
};
