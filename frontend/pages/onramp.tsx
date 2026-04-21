import { useRouter } from 'next/router';

import { OnRampIframe } from '@/components/OnRampIframe/OnRampIframe';

export default function OnRamp() {
  const router = useRouter();

  const { amount, networkName, cryptoCurrencyCode, walletAddress } =
    router.query;
  const amountToPay = amount ? Number(amount) : undefined;
  const network = networkName ? networkName : undefined;
  const cryptoCurrency = cryptoCurrencyCode ? cryptoCurrencyCode : undefined;
  const address = walletAddress ? walletAddress : undefined;

  if (!amountToPay || !network || !cryptoCurrency || !address) return null;
  if (typeof network !== 'string') return null;
  if (typeof cryptoCurrency !== 'string') return null;
  if (typeof address !== 'string') return null;

  return (
    <OnRampIframe
      usdAmountToPay={amountToPay}
      networkName={network}
      cryptoCurrencyCode={cryptoCurrency}
      walletAddress={address}
    />
  );
}
