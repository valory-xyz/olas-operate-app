import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { validateGeminiApiKey } from '../../../../../components/AgentForms/common/validations';

jest.mock('../../../../../components/AgentForms/common/validations', () => ({
  validateGeminiApiKey: jest.fn(),
}));

const mockValidateGeminiApiKey = validateGeminiApiKey as jest.MockedFunction<
  typeof validateGeminiApiKey
>;

const { usePredictFormValidate } =
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../../../../../components/SetupPage/SetupYourAgent/PredictAgentForm/usePredictFormValidate') as typeof import('../../../../../components/SetupPage/SetupYourAgent/PredictAgentForm/usePredictFormValidate');

describe('usePredictFormValidate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return correct initial state', () => {
    const { result } = renderHook(() => usePredictFormValidate());
    expect(result.current.isValidating).toBe(false);
    expect(result.current.submitButtonText).toBe('Continue');
    expect(result.current.geminiApiKeyValidationStatus).toBe('unknown');
  });

  it('should accept a custom default button text', () => {
    const { result } = renderHook(() => usePredictFormValidate('Set up agent'));
    expect(result.current.submitButtonText).toBe('Set up agent');
  });

  it('should validate successfully when geminiApiKey is not provided', async () => {
    const { result } = renderHook(() => usePredictFormValidate());
    let validateResult: boolean | undefined;
    await act(async () => {
      validateResult = await result.current.validateForm({});
    });
    expect(validateResult).toBe(true);
    expect(mockValidateGeminiApiKey).not.toHaveBeenCalled();
  });

  it('should validate successfully when geminiApiKey is valid', async () => {
    mockValidateGeminiApiKey.mockResolvedValue(true);
    const { result } = renderHook(() => usePredictFormValidate());
    let validateResult: boolean | undefined;
    await act(async () => {
      validateResult = await result.current.validateForm({
        geminiApiKey: 'valid-gemini-key',
      });
    });
    expect(validateResult).toBe(true);
    expect(mockValidateGeminiApiKey).toHaveBeenCalledWith('valid-gemini-key');
  });

  it('should return undefined and set status to invalid when geminiApiKey is invalid', async () => {
    mockValidateGeminiApiKey.mockResolvedValue(false);
    const { result } = renderHook(() => usePredictFormValidate());
    let validateResult: boolean | undefined;
    await act(async () => {
      validateResult = await result.current.validateForm({
        geminiApiKey: 'invalid-gemini-key',
      });
    });
    expect(validateResult).toBeUndefined();
    expect(result.current.geminiApiKeyValidationStatus).toBe('invalid');
  });

  it('should set submitButtonText to "Validating..." during validation', async () => {
    let resolveValidation: (value: boolean) => void;
    mockValidateGeminiApiKey.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveValidation = resolve;
        }),
    );
    const { result } = renderHook(() => usePredictFormValidate());
    let validatePromise: Promise<boolean | undefined>;
    act(() => {
      validatePromise = result.current.validateForm({
        geminiApiKey: 'some-key',
      });
    });
    expect(result.current.submitButtonText).toBe('Validating...');
    await act(async () => {
      resolveValidation!(true);
      await validatePromise;
    });
  });

  it('should reset isValidating to false after validation completes', async () => {
    mockValidateGeminiApiKey.mockResolvedValue(true);
    const { result } = renderHook(() => usePredictFormValidate());
    await act(async () => {
      await result.current.validateForm({
        geminiApiKey: 'valid-key',
      });
    });
    expect(result.current.isValidating).toBe(false);
  });

  it('should update submitButtonText via updateSubmitButtonText', () => {
    const { result } = renderHook(() => usePredictFormValidate());
    act(() => {
      result.current.updateSubmitButtonText('Submit');
    });
    expect(result.current.submitButtonText).toBe('Submit');
  });

  it('should handle error thrown by validateGeminiApiKey', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockValidateGeminiApiKey.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => usePredictFormValidate());
    let validateResult: boolean | undefined;
    await act(async () => {
      validateResult = await result.current.validateForm({
        geminiApiKey: 'some-key',
      });
    });
    expect(validateResult).toBeUndefined();
    expect(result.current.isValidating).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error validating predict form:',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});
