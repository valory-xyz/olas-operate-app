import { Bridge } from '@/components/Bridge';

// TODO: to be implemented
export const BridgeCryptoOn = ({ onBack }: { onBack: () => void }) => {
  return (
    <Bridge
      showCompleteScreen={{ completionMessage: 'Bridge completed!' }}
      onPrevBeforeBridging={onBack}
      bridgeFromDescription="Send the specified amounts from your external wallet to the Pearl Wallet address below. Pearl will automatically detect your transfer and bridge the funds for you."
      getBridgeRequirementsParams={() => null}
    />
  );
};
