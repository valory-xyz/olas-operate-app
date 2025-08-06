import { useRouter } from 'next/router';

import { OnRampIframe } from '@/components/OnRampIframe/OnRampIframe';
import { OnRampWidget } from '@/components/OnRampWidget/OnRampWidget';

const TYPE: 'widget' | 'iframe' = 'iframe';

export default function OnRamp() {
  const router = useRouter();

  const { amount } = router.query;
  const amountToPay = amount ? Number(amount) : undefined;
  if (!amountToPay) return null;

  if (TYPE === 'widget') {
    return <OnRampWidget usdAmountToPay={amountToPay} />;
  } else {
    return <OnRampIframe usdAmountToPay={amountToPay} />;
  }
}
