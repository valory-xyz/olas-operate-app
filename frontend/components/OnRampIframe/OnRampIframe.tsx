import { Flex } from 'antd';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

import { APP_HEIGHT, APP_WIDTH } from '@/constants/width';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useMasterWalletContext } from '@/hooks/useWallet';

import { KEY } from './constants';

type Environment = 'STAGING' | 'PRODUCTION';

const apiKeyFromQuery = KEY;
const envFromQuery = 'STAGING';

type OnRampIframeProps = {
  usdAmountToPay: number;
};

// const STAGING_URL = `https://transak-double-iframe-supporter.vercel.app/staging?environment=STAGING`;
// const PRODUCTION_URL = `https://transak-double-iframe-supporter.vercel.app/production?environment=PRODUCTION`;

const STAGING_URL = `https://global-stg.transak.com/`;
const PRODUCTION_URL = `https://global.transak.com/`;

export const OnRampIframe = ({ usdAmountToPay }: OnRampIframeProps) => {
  const router = useRouter();
  const { networkName, cryptoCurrencyCode } = useOnRampContext();
  const { masterEoa } = useMasterWalletContext();

  const [environment, setEnvironment] = useState<Environment>('STAGING');
  const [apiKey, setApiKey] = useState<string>('');

  // Initialize state from URL query parameters once router is ready
  useEffect(() => {
    if (!router.isReady) return;

    // const envFromQuery = router.query.environment as Environment;
    // const apiKeyFromQuery = router.query.apiKey as string;

    if (
      envFromQuery &&
      (envFromQuery === 'STAGING' || envFromQuery === 'PRODUCTION')
    ) {
      setEnvironment(envFromQuery);
    }

    if (apiKeyFromQuery) {
      setApiKey(apiKeyFromQuery);
    }
  }, [router.isReady, router.query]);

  const onRampUrl = useMemo(() => {
    if (!masterEoa?.address) return;
    if (!networkName || !cryptoCurrencyCode) return;

    if (!apiKey) {
      console.error('TRANSAK_API_KEY is not set');
      return;
    }

    const url = new URL(
      environment === 'STAGING' ? STAGING_URL : PRODUCTION_URL,
    );
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('productsAvailed', 'BUY');
    url.searchParams.set('paymentMethod', 'credit_debit_card');
    url.searchParams.set('network', networkName);
    url.searchParams.set('cryptoCurrencyCode', cryptoCurrencyCode);
    url.searchParams.set('fiatCurrency', 'USD');
    url.searchParams.set('fiatAmount', String(usdAmountToPay));
    url.searchParams.set('walletAddress', masterEoa.address);
    url.searchParams.set('hideMenu', 'true');

    return url.toString();
  }, [
    environment,
    apiKey,
    masterEoa,
    networkName,
    cryptoCurrencyCode,
    usdAmountToPay,
  ]);

  return (
    <Flex
      justify="center"
      align="center"
      vertical
      style={{
        overflow: 'hidden',
        height: `calc(${APP_HEIGHT}px - 45px)`,
        width: APP_WIDTH,
      }}
    >
      {onRampUrl && (
        <iframe
          id="transak-iframe"
          style={{ width: '100%', height: '100%', border: 'none' }}
          src={onRampUrl}
          allow="camera;microphone;payment"
        />
      )}
    </Flex>
  );
};
