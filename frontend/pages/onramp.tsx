import { useRouter } from 'next/router';

import { OnRampIframe } from '@/components/OnRampIframe/OnRampIframe';

export default function OnRamp() {
  const router = useRouter();

  const { nativeAmount, currencyCode } = router.query;

  if (typeof nativeAmount !== 'string' || !nativeAmount) return null;
  if (typeof currencyCode !== 'string' || !currencyCode) return null;

  return (
    <OnRampIframe nativeAmount={nativeAmount} currencyCode={currencyCode} />
  );
}
