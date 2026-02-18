import { useEffect } from 'react';

type ErrorLogger = (error: Error, errorInfo?: unknown) => void;

/**
 * Hook to handle error logging of asynchronous functions/methods
 */
export const useGlobalErrorHandlers = (
  nextLogError: ErrorLogger | undefined,
) => {
  useEffect(() => {
    if (!nextLogError) return;

    const handleError = (event: ErrorEvent) => {
      const error = event.error || new Error(event.message);
      nextLogError(error, {
        type: 'unhandled-error',
        filename: event.filename,
        lineno: event.lineno,
        stack: error?.stack,
        colno: event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));
      nextLogError(error, {
        type: 'unhandled-rejection',
        reason: event.reason,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection,
      );
    };
  }, [nextLogError]);
};
