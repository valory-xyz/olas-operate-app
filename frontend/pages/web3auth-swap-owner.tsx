import { Alert } from 'antd';
import { useRouter } from 'next/router';

import { Web3AuthSwapOwnerIframe } from '@/components/Web3AuthIframe/Web3AuthSwapOwnerIframe';
import { Address } from '@/types';

export default function Web3AuthSwapOwner() {
  const router = useRouter();

  const {
    safeAddress,
    oldOwnerAddress,
    newOwnerAddress,
    backupOwnerAddress,
    chainId,
  } = router.query;

  // Wait for router to be ready and all required params to be available
  if (
    !router.isReady ||
    !safeAddress ||
    !oldOwnerAddress ||
    !newOwnerAddress ||
    !backupOwnerAddress ||
    !chainId
  ) {
    console.error('Missing required parameters for Web3AuthSwapOwner');
    return (
      <Alert message="Invalid recovery parameters" type="error" showIcon />
    );
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
