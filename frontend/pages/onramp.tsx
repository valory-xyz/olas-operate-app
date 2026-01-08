import { useRouter } from 'next/router';

import { OnRampIframe } from '@/components/OnRampIframe/OnRampIframe';

export default function OnRamp() {
  const router = useRouter();

  const { amount, networkName, cryptoCurrencyCode } = router.query;
  const amountToPay = amount ? Number(amount) : undefined;
  const network = networkName ? networkName : undefined;
  const cryptoCurrency = cryptoCurrencyCode ? cryptoCurrencyCode : undefined;

  if (!amountToPay || !network || !cryptoCurrency) return null;
  if (typeof network !== 'string') return null;
  if (typeof cryptoCurrency !== 'string') return null;

  return (
    <OnRampIframe
      usdAmountToPay={amountToPay}
      networkName={network}
      cryptoCurrencyCode={cryptoCurrency}
    />
  );
}
