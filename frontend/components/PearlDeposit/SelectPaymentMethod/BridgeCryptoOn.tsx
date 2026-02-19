import { Button } from 'antd';
import { entries } from 'lodash';
import { useCallback, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { Bridge } from '@/components/Bridge';
import { SuccessOutlined } from '@/components/custom-icons';
import { Modal } from '@/components/ui';
import {
  ETHEREUM_TOKEN_CONFIG,
  TOKEN_CONFIG,
  TokenSymbol,
} from '@/config/tokens';
import { AddressZero, MiddlewareChain, MiddlewareChainMap } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { useMasterWalletContext } from '@/hooks';
import { Address } from '@/types/Address';
import { BridgeRefillRequirementsRequest, BridgeRequest } from '@/types/Bridge';
import { TokenAmountDetails, TokenAmounts } from '@/types/Wallet';
import {
  asEvmChainId,
  getFromToken,
  getTokenDecimal,
  parseUnits,
} from '@/utils';

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
  const {
    masterEoa,
    getMasterSafeOf,
    isFetched: isMasterWalletFetched,
  } = useMasterWalletContext();
  const toChainConfig = TOKEN_CONFIG[asEvmChainId(bridgeToChain)];

  return useCallback(
    (toTokenAddress: Address, amount: number) => {
      if (!masterEoa) throw new Error('Master EOA is not available');
      if (!isMasterWalletFetched) throw new Error('Master Safe not loaded');

      const masterSafeOnToChain = getMasterSafeOf?.(
        asEvmChainId(bridgeToChain),
      );

      if (!masterSafeOnToChain) throw new Error('Master Safe is not available');

      const fromToken = getFromToken(
        toTokenAddress,
        fromChainConfig,
        toChainConfig,
      );
      const tokenDecimal = getTokenDecimal(toTokenAddress, toChainConfig);

      return {
        from: {
          chain: MiddlewareChainMap.ETHEREUM,
          // Note: "from" address should always be mEOA for bridging
          address: masterEoa.address,
          token: fromToken,
        },
        to: {
          chain: bridgeToChain,
          address: masterSafeOnToChain.address,
          token: toTokenAddress,
          amount: parseUnits(amount, tokenDecimal),
        },
      } satisfies BridgeRequest;
    },
    [
      masterEoa,
      isMasterWalletFetched,
      getMasterSafeOf,
      bridgeToChain,
      toChainConfig,
    ],
  );
};

export const BridgeCryptoOn = ({
  bridgeToChain,
  amountsToDeposit,
  onBack,
}: BridgeCryptoOnProps) => {
  const { onReset } = usePearlWallet();
  const [showBridgingCompleteModal, setShowBridgingCompleteModal] =
    useState(false);

  const getBridgeRequirementsParams =
    useGetBridgeRequirementsParams(bridgeToChain);

  const handleGetBridgeRequirementsParams = useCallback(
    (forceUpdate?: boolean): BridgeRefillRequirementsRequest => {
      const toDeposit = entries(amountsToDeposit).filter(
        ([, { amount }]) => amount && amount > 0,
      ) as [TokenSymbol, TokenAmountDetails][];

      if (toDeposit.length === 0) {
        throw new Error('No amounts to deposit');
      }

      const bridgeParams = toDeposit.map(([tokenSymbol, { amount }]) => {
        const token = TOKEN_CONFIG[asEvmChainId(bridgeToChain)][tokenSymbol];
        if (!token) {
          throw new Error(
            `Token ${tokenSymbol} is not supported on ${bridgeToChain}`,
          );
        }

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

  const handleBridgingCompleted = useCallback(() => {
    setShowBridgingCompleteModal(true);
  }, [setShowBridgingCompleteModal]);

  const handleSeeWalletBalance = useCallback(() => {
    setShowBridgingCompleteModal(false);
    onReset(true);
  }, [onReset]);

  useUnmount(() => {
    setShowBridgingCompleteModal(false);
  });

  return (
    <>
      <Bridge
        bridgeToChain={bridgeToChain}
        getBridgeRequirementsParams={handleGetBridgeRequirementsParams}
        onPrevBeforeBridging={onBack}
        onBridgingCompleted={handleBridgingCompleted}
      />
      {showBridgingCompleteModal && (
        <Modal
          header={<SuccessOutlined />}
          title="Bridge Completed!"
          description="Your funds have been bridged successfully."
          action={
            <Button
              type="primary"
              size="large"
              block
              className="mt-32"
              onClick={handleSeeWalletBalance}
            >
              See wallet balance
            </Button>
          }
        />
      )}
    </>
  );
};
