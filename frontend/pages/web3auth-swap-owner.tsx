import { useRouter } from 'next/router';

import { Web3AuthSwapOwnerIframe } from '@/components/Web3AuthIframe/Web3AuthSwapOwnerIframe';
import { Address } from '@/types';

export default function Web3AuthSwapOwner() {
  const router = useRouter();

  console.log('Web3AuthSwapOwner page loaded');
  console.log('Router ready:', router.isReady);
  console.log('Router query:', router.query);
  console.log('Full router:', router);

  const {
    safeAddress,
    oldOwnerAddress,
    newOwnerAddress,
    backupOwnerAddress,
    chainId,
  } = router.query;

  console.log('Extracted params:', {
    safeAddress,
    oldOwnerAddress,
    newOwnerAddress,
    backupOwnerAddress,
    chainId,
  });

  // Wait for router to be ready and all required params to be available
  if (
    !router.isReady ||
    !safeAddress ||
    !oldOwnerAddress ||
    !newOwnerAddress ||
    !backupOwnerAddress ||
    !chainId
  ) {
    return null;
  }

  return (
    <Web3AuthSwapOwnerIframe
      safeAddress={safeAddress as Address}
      oldOwnerAddress={oldOwnerAddress as Address}
      newOwnerAddress={newOwnerAddress as Address}
      backupOwnerAddress={backupOwnerAddress as Address}
      chainId={Number(chainId)}
    />
  );
}
