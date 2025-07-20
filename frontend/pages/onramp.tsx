import { useRouter } from 'next/router';

import { OnRampWidget } from '@/components/OnRamp/OnRampWidget';

export default function OnRamp() {
  const router = useRouter();

  const { amount } = router.query;
  const amountToPay = amount ? Number(amount) : undefined;
  if (!amountToPay) return null;

  return <OnRampWidget usdAmountToPay={amountToPay} />;
}
