import { entries } from 'lodash';
import { useCallback } from 'react';

import { MiddlewareChain } from '@/client';
import { Bridge, getFromToken, getTokenDecimal } from '@/components/Bridge';
import { ETHEREUM_TOKEN_CONFIG, TOKEN_CONFIG } from '@/config/tokens';
import { AddressZero, TokenSymbol } from '@/constants';
import { useMasterWalletContext } from '@/hooks';
import { Address } from '@/types/Address';
import { BridgeRefillRequirementsRequest, BridgeRequest } from '@/types/Bridge';
import { TokenAmounts } from '@/types/Wallet';
import { asEvmChainId, parseUnits } from '@/utils';

import { usePearlWallet } from '../../PearlWalletProvider';

type BridgeCryptoOnProps = {
  onBack: () => void;
  bridgeToChain: MiddlewareChain;
  amountsToDeposit: TokenAmounts;
};

const fromChainConfig = ETHEREUM_TOKEN_CONFIG;

/**
 * Get bridge requirements parameters from the input provided by the user
 * for the specified bridgeToChain.
 */
const useGetBridgeRequirementsParams = (bridgeToChain: MiddlewareChain) => {
  const { masterSafeAddress } = usePearlWallet();
  const { masterEoa } = useMasterWalletContext();
  const toChainConfig = TOKEN_CONFIG[asEvmChainId(bridgeToChain)];

  return useCallback(
    (toTokenAddress: Address, amount: number) => {
      if (!masterEoa) throw new Error('Master EOA is not available');
      if (!masterSafeAddress) throw new Error('Master Safe is not available');

      const fromToken = getFromToken(
        toTokenAddress,
        fromChainConfig,
        toChainConfig,
      );
      const tokenDecimal = getTokenDecimal(toTokenAddress, toChainConfig);

      return {
        from: {
          chain: MiddlewareChain.ETHEREUM,
          address: masterEoa.address,
          token: fromToken,
        },
        to: {
          chain: bridgeToChain,
          address: masterSafeAddress,
          token: toTokenAddress,
          amount: parseUnits(amount, tokenDecimal),
        },
      } satisfies BridgeRequest;
    },
    [bridgeToChain, toChainConfig, masterEoa, masterSafeAddress],
  );
};

export const BridgeCryptoOn = ({
  bridgeToChain,
  amountsToDeposit,
  onBack,
}: BridgeCryptoOnProps) => {
  const { onReset } = usePearlWallet();
  const getBridgeRequirementsParams =
    useGetBridgeRequirementsParams(bridgeToChain);

  const handleGetBridgeRequirementsParams = useCallback(
    (forceUpdate?: boolean): BridgeRefillRequirementsRequest => {
      const toDeposit = entries(amountsToDeposit).filter(
        ([, amount]) => amount && amount > 0,
      ) as [TokenSymbol, number][];

      if (toDeposit.length === 0) {
        throw new Error('No amounts to deposit');
      }

      const bridgeParams = toDeposit.map(([tokenSymbol, amount]) => {
        const token = TOKEN_CONFIG[asEvmChainId(bridgeToChain)][tokenSymbol];
        return getBridgeRequirementsParams(
          token.address ?? AddressZero,
          amount,
        );
      });

      return {
        bridge_requests: bridgeParams,
        force_update: forceUpdate ?? false,
      };
    },
    [amountsToDeposit, bridgeToChain, getBridgeRequirementsParams],
  );

  return (
    <Bridge
      bridgeFromDescription="Send the specified amounts from your external wallet to the Pearl Wallet address below. Pearl will automatically detect your transfer and bridge the funds for you."
      bridgeToChain={bridgeToChain}
      getBridgeRequirementsParams={handleGetBridgeRequirementsParams}
      onPrevBeforeBridging={onBack}
      showCompleteScreen={{
        completionMessage: 'Bridge completed!',
        onComplete: onReset,
      }}
    />
  );
};
