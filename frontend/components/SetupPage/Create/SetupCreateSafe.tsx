import { Card, message, Typography } from 'antd';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Chain } from '@/client';
import { CardSection } from '@/components/styled/CardSection';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { SUPPORT_URL } from '@/constants/urls';
import { Pages } from '@/enums/PageState';
import { useMasterSafe } from '@/hooks/useMasterSafe';
import { usePageState } from '@/hooks/usePageState';
import { useSetup } from '@/hooks/useSetup';
import { useWallet } from '@/hooks/useWallet';
import { WalletService } from '@/service/Wallet';
import { delayInSeconds } from '@/utils/delay';

export const SetupCreateSafe = () => {
  const { goto } = usePageState();
  const { updateWallets } = useWallet();
  const { updateMasterSafeOwners, masterSafeAddress, backupSafeAddress } =
    useMasterSafe();
  const { backupSigner } = useSetup();

  const [isCreatingSafe, setIsCreatingSafe] = useState(false);
  const [isCreateSafeSuccessful, setIsCreateSafeSuccessful] = useState(false);
  const [failed, setFailed] = useState(false);

  const createSafeWithRetries = useCallback(
    async (retries: number) => {
      setIsCreatingSafe(true);

      // If we have retried too many times, set failed
      if (retries <= 0) {
        setFailed(true);
        setIsCreatingSafe(false);
        setIsCreateSafeSuccessful(false);
        return;
      }

      // Try to create the safe
      WalletService.createSafe(Chain.GNOSIS, backupSigner)
        .then(async () => {
          // Backend returned success
          message.success('Account created');

          // Attempt wallet and master safe updates before proceeding
          try {
            await updateWallets();
            await updateMasterSafeOwners();
          } catch (e) {
            console.error(e);
          }

          // Set states for successful creation
          setIsCreatingSafe(false);
          setIsCreateSafeSuccessful(true);
          setFailed(false);
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
          createSafeWithRetries(newRetries);
        });
    },
    [backupSigner, updateMasterSafeOwners, updateWallets],
  );

  const creationStatusText = useMemo(() => {
    if (isCreatingSafe) return 'Creating account';
    if (masterSafeAddress && backupSafeAddress) return 'Account created';
    return 'Account creation in progress';
  }, [backupSafeAddress, isCreatingSafe, masterSafeAddress]);

  useEffect(() => {
    if (failed || isCreatingSafe || isCreateSafeSuccessful) return;
    createSafeWithRetries(3);
  }, [
    backupSigner,
    createSafeWithRetries,
    failed,
    isCreateSafeSuccessful,
    isCreatingSafe,
  ]);

  useEffect(() => {
    // Only progress is the safe is created and accessible via context (updates on interval)
    if (masterSafeAddress) goto(Pages.Main);
  }, [backupSafeAddress, goto, masterSafeAddress]);

  return (
    <Card bordered={false}>
      <CardSection
        vertical
        align="center"
        justify="center"
        padding="80px 24px"
        gap={12}
      >
        {failed ? (
          <>
            <Image src="/broken-robot.svg" alt="logo" width={80} height={80} />
            <Typography.Text type="secondary" className="mt-12">
              Error, please restart the app and try again.
            </Typography.Text>
            <Typography.Text style={{ fontSize: 'small' }}>
              If the issue persists,{' '}
              <a href={SUPPORT_URL} target="_blank" rel="noreferrer">
                contact Olas community support {UNICODE_SYMBOLS.EXTERNAL_LINK}
              </a>
              .
            </Typography.Text>
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
            <Typography.Text type="secondary">
              You will be redirected once the account is created
            </Typography.Text>
          </>
        )}
      </CardSection>
    </Card>
  );
};
