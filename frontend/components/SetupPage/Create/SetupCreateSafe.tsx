import { Card, message, Typography } from 'antd';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { MiddlewareChain } from '@/client';
import { CardSection } from '@/components/styled/CardSection';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { SUPPORT_URL } from '@/constants/urls';
import { Pages } from '@/enums/Pages';
import { useMasterSafe } from '@/hooks/useMasterSafe';
import { usePageState } from '@/hooks/usePageState';
import { useSetup } from '@/hooks/useSetup';
import { useWallet } from '@/hooks/useWallet';
import { WalletService } from '@/service/Wallet';
import { delayInSeconds } from '@/utils/delay';

const { Text } = Typography;

const capitalizedMiddlewareChainNames: { [key in MiddlewareChain]: string } = {
  [MiddlewareChain.ETHEREUM]: 'Ethereum',
  [MiddlewareChain.BASE]: 'Base',
  [MiddlewareChain.OPTIMISM]: 'Optimism',
  [MiddlewareChain.GOERLI]: 'Goerli',
  [MiddlewareChain.GNOSIS]: 'Gnosis',
  [MiddlewareChain.SOLANA]: 'Solana',
  [MiddlewareChain.MODE]: 'Mode',
};

export const SetupCreateSafe = () => {
  const { goto } = usePageState();
  const {
    updateWallets,
    masterSafeAddressKeyExistsForChain,
    masterSafeAddress,
  } = useWallet();
  const { updateMasterSafeOwners } = useMasterSafe();
  const { backupSigner } = useSetup();

  const [isCreatingSafe, setIsCreatingSafe] = useState(false);

  const [optimismFailed, setOptimismFailed] = useState(false);
  const [ethereumFailed, setEthereumFailed] = useState(false);
  const [baseFailed, setBaseFailed] = useState(false);

  const [isOptimismSuccess, setIsOptimismSuccess] = useState(false);
  const [isEthereumSuccess, setIsEthereumSuccess] = useState(false);
  const [isBaseSuccess, setIsBaseSuccess] = useState(false);

  const createSafeWithRetries = useCallback(
    async (middlewareChain: MiddlewareChain, retries: number) => {
      setIsCreatingSafe(true);

      // If we have retried too many times, set failed
      if (retries <= 0) {
        if (middlewareChain === MiddlewareChain.OPTIMISM) {
          setOptimismFailed(true);
          setIsOptimismSuccess(false);
          throw new Error('Failed to create safe on Ethereum');
        }
        if (middlewareChain === MiddlewareChain.ETHEREUM) {
          setEthereumFailed(true);
          setIsEthereumSuccess(false);
          throw new Error('Failed to create safe on Ethereum');
        }
        if (middlewareChain === MiddlewareChain.BASE) {
          setBaseFailed(true);
          setIsBaseSuccess(false);
          throw new Error('Failed to create safe on Base');
        }
        throw new Error('Failed to create safe as chain is not supported');
      }

      // Try to create the safe
      WalletService.createSafe(middlewareChain, backupSigner)
        .then(async () => {
          // Attempt wallet and master safe updates before proceeding
          try {
            await updateWallets();
            await updateMasterSafeOwners();
          } catch (e) {
            console.error(e);
          }

          // Set states for successful creation
          setIsCreatingSafe(false);
          setOptimismFailed(false);
        })
        .catch(async (e) => {
          console.error(e);
          // Wait for 5 seconds before retrying
          await delayInSeconds(5);
          // Retry
          const newRetries = retries - 1;
          if (newRetries <= 0) {
            message.error('Failed to create account');
          } else {
            message.error('Failed to create account, retrying in 5 seconds');
          }
          createSafeWithRetries(middlewareChain, newRetries);
        });
    },
    [backupSigner, updateMasterSafeOwners, updateWallets],
  );

  const creationStatusText = useMemo(() => {
    if (isCreatingSafe) return 'Creating accounts';
    if (masterSafeAddress) return 'Account created';
    return 'Account creation in progress';
  }, [isCreatingSafe, masterSafeAddress]);

  useEffect(() => {
    if (
      /**
       * Avoid creating safes if any of the following conditions are met:
       */
      [optimismFailed, baseFailed, ethereumFailed].some((x) => x) || // any of the chains failed
      isCreatingSafe //|| // already creating a safe
      // [isBaseSuccess, isEthereumSuccess, isOptimismSuccess].some((x) => !x) // any of the chains are not successful
    )
      return;

    const chainsToCreateSafesFor = {
      [MiddlewareChain.OPTIMISM]: masterSafeAddressKeyExistsForChain(
        MiddlewareChain.OPTIMISM,
      ),
      [MiddlewareChain.ETHEREUM]: masterSafeAddressKeyExistsForChain(
        MiddlewareChain.ETHEREUM,
      ),
      [MiddlewareChain.BASE]: masterSafeAddressKeyExistsForChain(
        MiddlewareChain.BASE,
      ),
    };

    const safeCreationsRequired = Object.entries(chainsToCreateSafesFor).reduce(
      (acc, [chain, safeAddressAlreadyExists]) => {
        const middlewareChain = chain as MiddlewareChain;
        if (safeAddressAlreadyExists) {
          switch (middlewareChain) {
            case MiddlewareChain.OPTIMISM:
              setIsOptimismSuccess(true);
              break;
            case MiddlewareChain.ETHEREUM:
              setIsEthereumSuccess(true);
              break;
            case MiddlewareChain.BASE:
              setIsBaseSuccess(true);
              break;
          }
          return acc;
        }
        return [...acc, middlewareChain];
      },
      [] as MiddlewareChain[],
    );

    (async () => {
      for (const middlewareChain of safeCreationsRequired) {
        try {
          await createSafeWithRetries(middlewareChain, 3);
          message.success(
            `${capitalizedMiddlewareChainNames[middlewareChain]} account created`,
          );
        } catch (e) {
          message.warning(
            `Failed to create ${capitalizedMiddlewareChainNames[middlewareChain]} account`,
          );
          console.error(e);
        }
      }
    })().then(() => {
      setIsCreatingSafe(false);
    });
  }, [
    backupSigner,
    createSafeWithRetries,
    optimismFailed,
    isCreatingSafe,
    isBaseSuccess,
    isEthereumSuccess,
    isOptimismSuccess,
    baseFailed,
    ethereumFailed,
    masterSafeAddressKeyExistsForChain,
  ]);

  useEffect(() => {
    // Only progress is the safe is created and accessible via context (updates on interval)
    if (masterSafeAddress) goto(Pages.Main);
  }, [goto, masterSafeAddress]);

  return (
    <Card bordered={false}>
      <CardSection
        vertical
        align="center"
        justify="center"
        padding="80px 24px"
        gap={12}
      >
        {optimismFailed ? (
          <>
            <Image src="/broken-robot.svg" alt="logo" width={80} height={80} />
            <Text type="secondary" className="mt-12">
              Error, please restart the app and try again.
            </Text>
            <Text style={{ fontSize: 'small' }}>
              If the issue persists,{' '}
              <a href={SUPPORT_URL} target="_blank" rel="noreferrer">
                contact Olas community support {UNICODE_SYMBOLS.EXTERNAL_LINK}
              </a>
              .
            </Text>
          </>
        ) : (
          <>
            <Image
              src="/onboarding-robot.svg"
              alt="logo"
              width={80}
              height={80}
            />
            <Typography.Title
              level={4}
              className="m-0 mt-12 loading-ellipses"
              style={{ width: '220px' }}
            >
              {creationStatusText}
            </Typography.Title>
            <Text type="secondary">
              You will be redirected once the account is created.
            </Text>
          </>
        )}
      </CardSection>
    </Card>
  );
};
