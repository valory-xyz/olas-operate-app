/**
 * Hook to access FE logging utilities from within React components.
 * Provides a convenient way to log events without manually passing nextLogEvent.
 */

import { useElectronApi } from '@/hooks/useElectronApi';
import {
  type FELogCode,
  type FELogEvent,
  type FEOutcome,
  logAppLifecycle,
  logBridgeEvent,
  logEvent,
  logFundingEvent,
  logNavigation,
  logUIError,
  logUINotification,
  logUIWarning,
  logWeb3AuthEvent,
} from '@/utils/logger';

export const useFELogger = () => {
  const { nextLogEvent } = useElectronApi();

  return {
    logEvent: (event: FELogEvent) => logEvent(event, nextLogEvent),
    logNavigation: (params: { screen: string }) =>
      logNavigation(params, nextLogEvent),
    logUIError: (params: {
      screen: string;
      code: FELogCode;
      message?: string;
    }) => logUIError(params, nextLogEvent),
    logUIWarning: (params: { screen: string; message?: string }) =>
      logUIWarning(params, nextLogEvent),
    logUINotification: (params: { screen: string; message?: string }) =>
      logUINotification(params, nextLogEvent),
    logFundingEvent: (params: {
      outcome: FEOutcome;
      code?: FELogCode;
      message?: string;
      screen?: string;
    }) => logFundingEvent(params, nextLogEvent),
    logBridgeEvent: (params: {
      outcome: FEOutcome;
      code?: FELogCode;
      message?: string;
      screen?: string;
    }) => logBridgeEvent(params, nextLogEvent),
    logWeb3AuthEvent: (params: {
      outcome: FEOutcome;
      code?: FELogCode;
      message?: string;
      screen?: string;
    }) => logWeb3AuthEvent(params, nextLogEvent),
    logAppLifecycle: (params: {
      stage: 'boot' | 'loaded' | 'ready';
      message?: string;
    }) => logAppLifecycle(params, nextLogEvent),
  };
};
