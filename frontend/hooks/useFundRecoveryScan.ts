import { useMutation } from '@tanstack/react-query';

import { FundRecoveryService } from '@/service/FundRecovery';
import {
  FundRecoveryScanRequest,
  FundRecoveryScanResponse,
} from '@/types/FundRecovery';

export const useFundRecoveryScan = () =>
  useMutation<FundRecoveryScanResponse, Error, FundRecoveryScanRequest>({
    mutationFn: (request) => FundRecoveryService.scan(request),
  });
