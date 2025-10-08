import { MiddlewareChain } from '@/client';
import { Bridge } from '@/components/Bridge';

type BridgeCryptoOnProps = {
  onBack: () => void;
  bridgeToChain: MiddlewareChain;
};

export const BridgeCryptoOn = ({
  onBack,
  bridgeToChain,
}: BridgeCryptoOnProps) => {
  return (
    <Bridge
      bridgeFromDescription="Send the specified amounts from your external wallet to the Pearl Wallet address below. Pearl will automatically detect your transfer and bridge the funds for you."
      bridgeToChain={bridgeToChain}
      getBridgeRequirementsParams={() => null}
      onPrevBeforeBridging={onBack}
      showCompleteScreen={{ completionMessage: 'Bridge completed!' }}
    />
  );
};
