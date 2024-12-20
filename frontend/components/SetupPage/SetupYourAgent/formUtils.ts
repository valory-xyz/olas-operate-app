export const requiredRules = [{ required: true, message: 'Field is required' }];
export const validateMessages = { required: 'Field is required' };
export const commonFieldProps = { rules: requiredRules, hasFeedback: true };

export const emailValidateMessages = {
  required: 'Field is required',
  types: { email: 'Enter a valid email' },
};
