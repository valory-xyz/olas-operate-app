import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import {
  SupportedMiddlewareChain,
  SupportedMiddlewareChainMap,
} from '@/constants/chains';
import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import { BACKEND_URL } from '@/constants/urls';
import { Address } from '@/types/Address';

type WithdrawalRequest = {
  password: string;
  to: Address;
  withdraw_assets: {
    [chain in keyof SupportedMiddlewareChainMap]: {
      [token: Address]: number;
    };
  };
};

type WithdrawalResponse = {
  message: string;
  transfer_txs: {
    [chain in keyof SupportedMiddlewareChain]?: {
      [token: Address]: string[]; // List of successful txs from Master Safe and/or Master EOA
    };
  };
};

const withdrawFunds = async (
  request: WithdrawalRequest,
): Promise<WithdrawalResponse> =>
  fetch(`${BACKEND_URL}/wallet/withdraw`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify(request),
  })
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Failed to withdraw funds');
    })
    .catch((error) => {
      throw error;
    });

/*
{
  "password": "your_password",
  "to": "0x...",
  "withdraw_assets": {
    "gnosis": {
      "0x0000000000000000000000000000000000000000": 1000000000000000000,
      "0x...": 500000000000000000
    }
  }
}

{
  "message": "Funds withdrawn successfully.",
  "transfer_txs": {
    "gnosis": {
      "0x0000000000000000000000000000000000000000": ["0x...", "0x..."],  // List of successful txs from Master Safe and/or Master EOA
      "0x...": ["0x...", "0x..."]
    }
  }
}


*/

export const useWithdrawFunds = (withdrawAddress: string, password: string) => {
  const [message, setMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (
      withdrawAssets: WithdrawalRequest['withdraw_assets'],
    ) => {
      const response = await withdrawFunds({
        password,
        to: withdrawAddress as Address,
        withdraw_assets: withdrawAssets,
      });
      setMessage(response.message);
      return response;
    },
  });

  const isLoading = mutation.isPending;
  const hasError = mutation.isError;

  return {
    isLoading,
    hasError,
    message,
    mutate: mutation.mutate,
  };
  return {
    isLoading: false,
    hasError: true,
  };
};
