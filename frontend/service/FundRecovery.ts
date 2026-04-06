import { BACKEND_URL, CONTENT_TYPE_JSON_UTF8 } from '@/constants';
import {
  FundRecoveryExecuteRequest,
  FundRecoveryExecuteResponse,
  FundRecoveryScanRequest,
  FundRecoveryScanResponse,
} from '@/types/FundRecovery';

const scan = async (
  request: FundRecoveryScanRequest,
): Promise<FundRecoveryScanResponse> =>
  fetch(`${BACKEND_URL}/fund_recovery/scan`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify(request),
  }).then((res) => {
    if (res.ok) return res.json();
    return res.json().then((data) => {
      throw new Error(data?.error ?? 'Failed to scan for recoverable funds');
    });
  });

const execute = async (
  request: FundRecoveryExecuteRequest,
): Promise<FundRecoveryExecuteResponse> =>
  fetch(`${BACKEND_URL}/fund_recovery/execute`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify(request),
  }).then((res) => {
    if (res.ok) return res.json();
    return res.json().then((data) => {
      throw new Error(data?.error ?? 'Failed to execute fund recovery');
    });
  });

export const FundRecoveryService = {
  scan,
  execute,
};
