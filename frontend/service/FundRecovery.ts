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
  }).then(async (res) => {
    if (res.ok) return res.json();
    const text = await res.text();
    let errorMsg: string;
    try {
      errorMsg =
        JSON.parse(text)?.error ?? 'Failed to scan for recoverable funds';
    } catch {
      errorMsg = 'Failed to scan for recoverable funds';
    }
    throw new Error(errorMsg);
  });

const execute = async (
  request: FundRecoveryExecuteRequest,
): Promise<FundRecoveryExecuteResponse> =>
  fetch(`${BACKEND_URL}/fund_recovery/execute`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify(request),
  }).then(async (res) => {
    if (res.ok) return res.json();
    const text = await res.text();
    let errorMsg: string;
    try {
      errorMsg = JSON.parse(text)?.error ?? 'Failed to execute fund recovery';
    } catch {
      errorMsg = 'Failed to execute fund recovery';
    }
    throw new Error(errorMsg);
  });

export const FundRecoveryService = {
  scan,
  execute,
};
