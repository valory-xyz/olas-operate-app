import { useRouter } from 'next/router';

import { OnRampIframe } from '@/components/OnRampIframe/OnRampIframe';

export default function OnRamp() {
  const router = useRouter();

  const { nativeAmount, currencyCode, walletAddress } = router.query;

  if (typeof nativeAmount !== 'string' || !nativeAmount) return null;
  if (typeof currencyCode !== 'string' || !currencyCode) return null;
  if (typeof walletAddress !== 'string' || !walletAddress) return null;

  return (
    <OnRampIframe
      nativeAmount={nativeAmount}
      currencyCode={currencyCode}
      walletAddress={walletAddress}
    />
  );
}
