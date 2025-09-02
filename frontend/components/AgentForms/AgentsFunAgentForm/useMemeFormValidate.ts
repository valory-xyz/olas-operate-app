import { useCallback, useState } from 'react';

import { validateGeminiApiKey, ValidationStatus } from '../common/validations';

export type AgentsFunFieldValuesToValidate = {
  personaDescription: string;
  geminiApiKey: string;
  fireworksApiKey: string;
};

export const useMemeFormValidate = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [submitButtonText, setSubmitButtonText] = useState('Continue');
  const [geminiApiKeyValidationStatus, setGeminiApiKeyValidationStatus] =
    useState<ValidationStatus>('unknown');

  const handleValidate = useCallback(
    async (values: AgentsFunFieldValuesToValidate): Promise<boolean> => {
      setIsValidating(true);

      setGeminiApiKeyValidationStatus('unknown');
      setSubmitButtonText('Validating Gemini API key...');

      try {
        const isGeminiApiValid = await validateGeminiApiKey(
          values.geminiApiKey,
        );
        setGeminiApiKeyValidationStatus(isGeminiApiValid ? 'valid' : 'invalid');
        if (!isGeminiApiValid) return false;

        // wait for agent setup to complete
        setSubmitButtonText('Setting up agent...');

        return true;
      } catch (error) {
        console.error('Error validating meme form:', error);
      } finally {
        setIsValidating(false);
      }
      return false;
    },
    [],
  );

  return {
    isValidating,
    submitButtonText,
    setSubmitButtonText,
    geminiApiKeyValidationStatus,
    setGeminiApiKeyValidationStatus,
    validateForm: handleValidate,
  };
};
