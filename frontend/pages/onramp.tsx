import { useRouter } from 'next/router';

import { OnRampIframe } from '@/components/OnRampIframe/OnRampIframe';

export default function OnRamp() {
  const router = useRouter();

  const { amount } = router.query;
  const amountToPay = amount ? Number(amount) : undefined;
  if (!amountToPay) return null;

  return <OnRampIframe usdAmountToPay={amountToPay} />;
}
