import { Button } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { SuccessOutlined } from '@/components/custom-icons';
import { OnRamp } from '@/components/OnRamp';
import { Modal } from '@/components/ui';
import { TOKEN_CONFIG, TokenSymbol } from '@/config/tokens';
import { AddressZero, EvmChainId } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { useGetOnRampRequirementsParams, useOnRampContext } from '@/hooks';
import { BridgeRefillRequirementsRequest } from '@/types/Bridge';
import { TokenAmountDetails, TokenAmounts } from '@/types/Wallet';
import { asEvmChainDetails, asMiddlewareChain } from '@/utils';

type OnRampCryptoOnProps = {
  onBack: () => void;
  onRampChainId: EvmChainId;
  amountsToDeposit: TokenAmounts;
};

export const OnRampCryptoOn = ({
  onRampChainId,
  amountsToDeposit,
  onBack,
}: OnRampCryptoOnProps) => {
  const { onReset, walletChainId } = usePearlWallet();
  const { updateNetworkConfig } = useOnRampContext();
  const [showOnRampCompleteModal, setShowOnRampCompleteModal] = useState(false);

  // Set network config for deposit mode
  useEffect(() => {
    const toChain = asMiddlewareChain(onRampChainId);
    const chainDetails = asEvmChainDetails(toChain);

    updateNetworkConfig({
      networkId: onRampChainId,
      networkName: chainDetails.name,
      cryptoCurrencyCode: chainDetails.symbol,
      selectedChainId: walletChainId,
    });
  }, [walletChainId, onRampChainId, updateNetworkConfig]);

  const getOnRampRequirementsParams =
    useGetOnRampRequirementsParams(onRampChainId);

  const handleGetOnRampRequirementsParams = useCallback(
    (forceUpdate?: boolean): BridgeRefillRequirementsRequest => {
      if (!walletChainId) {
        throw new Error('Wallet chain ID is not available');
      }

      const toDeposit = Object.entries(amountsToDeposit).filter(
        ([, { amount }]) => amount && amount > 0,
      ) as [TokenSymbol, TokenAmountDetails][];

      if (toDeposit.length === 0) {
        throw new Error('No amounts to deposit');
      }

      const onRampParams = toDeposit.map(([tokenSymbol, { amount }]) => {
        const token = TOKEN_CONFIG[walletChainId][tokenSymbol];
        if (!token) {
          throw new Error(
            `Token ${tokenSymbol} is not supported on chain ${walletChainId}`,
          );
        }

        return getOnRampRequirementsParams(
          token.address ?? AddressZero,
          amount,
        );
      });

      return {
        bridge_requests: onRampParams,
        force_update: forceUpdate ?? false,
      };
    },
    [amountsToDeposit, walletChainId, getOnRampRequirementsParams],
  );

  const handleOnRampCompleted = useCallback(() => {
    setShowOnRampCompleteModal(true);
  }, []);

  const handleSeeWalletBalance = useCallback(() => {
    setShowOnRampCompleteModal(false);
    onReset(true);
  }, [onReset]);

  useUnmount(() => {
    setShowOnRampCompleteModal(false);
  });

  return (
    <>
      <OnRamp
        mode="deposit"
        getOnRampRequirementsParams={handleGetOnRampRequirementsParams}
        handleBack={onBack}
        onOnRampCompleted={handleOnRampCompleted}
      />
      {showOnRampCompleteModal && (
        <Modal
          header={<SuccessOutlined />}
          title="Purchase Completed!"
          description="Your funds have been purchased successfully."
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
