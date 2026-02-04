/**
 * Wrapper utilities for Ant Design message/notification that also logs to FE logger.
 * These are convenience functions to be used alongside the standard message API.
 */

import { MessageInstance } from 'antd/es/message/interface';

import { FELogCode } from '@/utils/logger';

/**
 * Shows an error message and logs it to FE logger.
 * @param messageApi - The message API instance from useMessageApi()
 * @param message - Error message content
 * @param logUIError - The logging function from useFELogger().logUIError
 * @param screen - Current screen name for logging
 * @param code - Optional error code for logging
 */
export const showErrorWithLogging = async (params: {
  messageApi: MessageInstance;
  message: string | React.ReactNode;
  logUIError: (params: {
    screen: string;
    code: FELogCode;
    message?: string;
  }) => Promise<void>;
  screen: string;
  code?: FELogCode;
}) => {
  const { messageApi, message, logUIError, screen, code = 'UI_ERROR' } = params;
  messageApi.error(message);
  try {
    await logUIError({
      screen,
      code,
      message: typeof message === 'string' ? message : 'UI Error',
    });
  } catch (e) {
    // Silently fail if logging fails
  }
};

/**
 * Shows a warning message and logs it to FE logger.
 * @param messageApi - The message API instance from useMessageApi()
 * @param message - Warning message content
 * @param logUIWarning - The logging function from useFELogger().logUIWarning
 * @param screen - Current screen name for logging
 */
export const showWarningWithLogging = async (params: {
  messageApi: MessageInstance;
  message: string | React.ReactNode;
  logUIWarning: (params: { screen: string; message?: string }) => Promise<void>;
  screen: string;
}) => {
  const { messageApi, message, logUIWarning, screen } = params;
  messageApi.warning(message);
  try {
    await logUIWarning({
      screen,
      message: typeof message === 'string' ? message : 'UI Warning',
    });
  } catch (e) {
    // Silently fail if logging fails
  }
};

/**
 * Shows a success message and logs it to FE logger.
 * @param messageApi - The message API instance from useMessageApi()
 * @param message - Success message content
 * @param logUINotification - The logging function from useFELogger().logUINotification
 * @param screen - Current screen name for logging
 */
export const showSuccessWithLogging = async (params: {
  messageApi: MessageInstance;
  message: string | React.ReactNode;
  logUINotification: (params: {
    screen: string;
    message?: string;
  }) => Promise<void>;
  screen: string;
}) => {
  const { messageApi, message, logUINotification, screen } = params;
  messageApi.success(message);
  try {
    await logUINotification({
      screen,
      message: typeof message === 'string' ? message : 'Success',
    });
  } catch (e) {
    // Silently fail if logging fails
  }
};

/**
 * Shows an info message and logs it to FE logger.
 * @param messageApi - The message API instance from useMessageApi()
 * @param message - Info message content
 * @param logUINotification - The logging function from useFELogger().logUINotification
 * @param screen - Current screen name for logging
 */
export const showInfoWithLogging = async (params: {
  messageApi: MessageInstance;
  message: string | React.ReactNode;
  logUINotification: (params: {
    screen: string;
    message?: string;
  }) => Promise<void>;
  screen: string;
}) => {
  const { messageApi, message, logUINotification, screen } = params;
  messageApi.info(message);
  try {
    await logUINotification({
      screen,
      message: typeof message === 'string' ? message : 'Info',
    });
  } catch (e) {
    // Silently fail if logging fails
  }
};
