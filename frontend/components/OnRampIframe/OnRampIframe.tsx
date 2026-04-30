import { Button, Flex, Spin } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Alert } from '@/components/ui';
import { APP_HEIGHT, APP_WIDTH } from '@/constants';
import { useElectronApi, useMasterWalletContext } from '@/hooks';
import { MoonPayService } from '@/service/MoonPay';
import { delayInSeconds } from '@/utils/delay';

/**
 * MoonPay widget origins allowlisted for postMessage events.
 * Production: https://buy.moonpay.com. Sandbox URL is the same family — when
 * pearl-api routes the signing request to MoonPay sandbox the widget is
 * served from buy-sandbox.moonpay.com (TODO Phase 0 step 4: confirm exact
 * sandbox host with infra/POC playback).
 */
const MOONPAY_ALLOWED_ORIGINS = [
  'https://buy.moonpay.com',
  'https://buy-sandbox.moonpay.com',
];

/**
 * postMessage event_id strings emitted by the MoonPay widget.
 *
 * MoonPay does not publicly document the raw-iframe wire format — these are
 * captured from VLOP-58 POC playback and treated as a project-internal
 * contract. TODO Phase 0 step 4: confirm exact strings (likely
 * `'CLOSE_WIDGET' | 'TRANSACTION_FAILED' | 'TRANSACTION_COMPLETED'` per the
 * SDK's `onClose / onTransactionCreated / onTransactionCompleted` callbacks).
 */
const MOONPAY_EVENT_IDS = {
  close: 'CLOSE_WIDGET',
  failed: 'TRANSACTION_FAILED',
  completed: 'TRANSACTION_COMPLETED',
} as const;

type MoonPayEvent = {
  data: {
    type?: string;
    event_id?: string;
    [key: string]: unknown;
  };
};

const FAILURE_DELAY_SECONDS = 3;

type OnRampIframeProps = {
  /** Locked native crypto amount, formatted as `toFixed(6)`. */
  nativeAmount: string;
  /** MoonPay currency code (e.g. `eth_base`, `pol`). */
  currencyCode: string;
};

export const OnRampIframe = ({
  nativeAmount,
  currencyCode,
}: OnRampIframeProps) => {
  const { onRampWindow, logEvent } = useElectronApi();
  const { masterEoa } = useMasterWalletContext();

  const ref = useRef<HTMLIFrameElement>(null);

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSignedUrl = useCallback(async () => {
    if (!masterEoa?.address) return;

    setIsLoading(true);
    setError(null);

    const result = await MoonPayService.getSignedUrl({
      nativeAmount,
      currencyCode,
      walletAddress: masterEoa.address,
    });

    if (result.success) {
      setSignedUrl(result.url);
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  }, [masterEoa, nativeAmount, currencyCode]);

  useEffect(() => {
    fetchSignedUrl();
  }, [fetchSignedUrl]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Defence-in-depth: origin allowlist + source identity check. Either
      // alone is bypassable; together they reject any nested or cross-origin
      // spoofed event.
      if (!MOONPAY_ALLOWED_ORIGINS.includes(event.origin)) return;
      if (event.source !== ref.current?.contentWindow) return;

      const eventDetails = event as unknown as MoonPayEvent;
      const eventId = eventDetails.data?.event_id ?? eventDetails.data?.type;
      if (!eventId) return;

      logEvent?.(`MoonPay event: ${JSON.stringify(eventId)}`);

      if (eventId === MOONPAY_EVENT_IDS.close) {
        onRampWindow?.close?.();
        return;
      }

      if (eventId === MOONPAY_EVENT_IDS.failed) {
        delayInSeconds(FAILURE_DELAY_SECONDS).then(() => {
          onRampWindow?.transactionFailure?.();
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [logEvent, onRampWindow]);

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
        padding: error ? 24 : 0,
      }}
    >
      {isLoading && <Spin />}
      {!isLoading && error && (
        <>
          <Alert
            type="error"
            showIcon
            message="Failed to load MoonPay. Please try again."
            description={error}
          />
          <Button onClick={fetchSignedUrl}>Retry</Button>
        </>
      )}
      {!isLoading && !error && signedUrl && (
        <iframe
          src={signedUrl}
          ref={ref}
          id="moonpay-iframe"
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="camera;microphone;payment"
        />
      )}
    </Flex>
  );
};
