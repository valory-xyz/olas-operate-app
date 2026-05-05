import { useMutation } from '@tanstack/react-query';

import { FundRecoveryService } from '@/service/FundRecovery';
import {
  FundRecoveryExecuteRequest,
  FundRecoveryExecuteResponse,
} from '@/types/FundRecovery';

export const useFundRecoveryExecute = () =>
  useMutation<FundRecoveryExecuteResponse, Error, FundRecoveryExecuteRequest>({
    mutationFn: (request) => FundRecoveryService.execute(request),
  });
