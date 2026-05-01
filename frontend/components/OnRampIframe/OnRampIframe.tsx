import { Button, Flex, Spin } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { Alert } from '@/components/ui';
import { APP_HEIGHT, APP_WIDTH } from '@/constants';
import { useElectronApi } from '@/hooks';
import { MoonPayService } from '@/service/MoonPay';

type OnRampIframeProps = {
  /** Locked native crypto amount, formatted as `toFixed(6)`. */
  nativeAmount: string;
  /** MoonPay currency code (e.g. `eth_base`, `pol_polygon`). */
  currencyCode: string;
  /**
   * Master EOA address — receives the on-ramped funds. Forwarded from the
   * parent window because the child window's MasterWalletProvider doesn't
   * hydrate (gated on isUserLoggedIn, which is false in the child tree).
   */
  walletAddress: string;
};

/**
 * Embeds the MoonPay buy widget as a raw iframe pointed at a server-signed URL.
 *
 * Lifecycle:
 * - Cancel: handled by Pearl's WindowControls close button (top-right X) which
 *   calls `electronAPI.onRampWindow.close()` directly.
 * - Success: detected by OnRampProvider's balance-polling effect on the master
 *   EOA's native balance — auto-closes the window when ≥90% of nativeAmount is
 *   received on the configured chain.
 * - Failure: user sees MoonPay's error UI in-widget and closes manually via
 *   Pearl's X. The `onramp-window-did-close` IPC resets loading state.
 *
 * MoonPay's raw-iframe wire format is undocumented and unreliable; we
 * intentionally do not listen to postMessage events from the iframe. See
 * tests/components/OnRampIframe/OnRampIframe.test.tsx for the contract.
 */
export const OnRampIframe = ({
  nativeAmount,
  currencyCode,
  walletAddress,
}: OnRampIframeProps) => {
  const { logEvent } = useElectronApi();

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchSignedUrl = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);

    const result = await MoonPayService.getSignedUrl({
      nativeAmount,
      currencyCode,
      walletAddress,
    });

    if (result.success) {
      setSignedUrl(result.url);
    } else {
      logEvent?.(`OnRampIframe getSignedUrl failed: ${result.error}`);
      setHasError(true);
    }
    setIsLoading(false);
  }, [walletAddress, nativeAmount, currencyCode, logEvent]);

  const handleIframeError = useCallback(() => {
    logEvent?.('OnRampIframe iframe failed to load');
    setHasError(true);
  }, [logEvent]);

  useEffect(() => {
    fetchSignedUrl();
  }, [fetchSignedUrl]);

  return (
    <Flex
      justify="center"
      align="center"
      vertical
      gap={16}
      style={{
        overflow: 'hidden',
        height: `calc(${APP_HEIGHT}px - 45px)`,
        width: APP_WIDTH,
        padding: hasError ? 24 : 0,
      }}
    >
      {isLoading && <Spin />}
      {!isLoading && hasError && (
        <>
          <Alert
            type="error"
            showIcon
            message="Failed to load MoonPay. Please try again."
          />
          <Button onClick={fetchSignedUrl}>Retry</Button>
        </>
      )}
      {!isLoading && !hasError && signedUrl && (
        <iframe
          src={signedUrl}
          id="moonpay-iframe"
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="camera;microphone;payment"
          onError={handleIframeError}
        />
      )}
    </Flex>
  );
};
