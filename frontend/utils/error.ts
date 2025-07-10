export type ApiErrorResponse = {
  error?: string;
  message?: string;
  [key: string]: unknown;
};

/**
 * Parses the API error response.
 */
export const parseApiError = async (
  response: Response,
  fallbackMessage = 'Something went wrong',
): Promise<never> => {
  let errorDetails: ApiErrorResponse | null = null;

  try {
    errorDetails = (await response.json()) as ApiErrorResponse;
  } catch {
    // silently ignore parse failure
  }

  const apiError = errorDetails?.error || errorDetails?.message;
  throw new Error(apiError || fallbackMessage);
};

/**
 * Gets a user-friendly error message from an error object.
 */
export const getErrorMessage = (e: unknown): string => {
  const message = e instanceof Error ? e.message : 'Something went wrong';
  console.error(e);
  return message;
};
