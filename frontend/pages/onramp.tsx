import { useRouter } from 'next/router';

import { OnRampIframe } from '@/components/OnRampIframe/OnRampIframe';
import { OnRampWidget } from '@/components/OnRampWidget/OnRampWidget';

const isWidget = false;

export default function OnRamp() {
  const router = useRouter();

  const { amount } = router.query;
  const amountToPay = amount ? Number(amount) : undefined;
  if (!amountToPay) return null;

  if (isWidget) {
    return <OnRampWidget usdAmountToPay={amountToPay} />;
  } else {
    return <OnRampIframe usdAmountToPay={amountToPay} />;
  }
}
