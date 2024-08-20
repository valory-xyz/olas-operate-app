import { message, Typography } from 'antd';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import { Chain } from '@/client';
import { CardSection } from '@/components/styled/CardSection';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { SUPPORT_URL } from '@/constants/urls';
import { Pages } from '@/enums/PageState';
import { usePageState } from '@/hooks/usePageState';
import { useSetupPage } from '@/hooks/useSetupPage';
import { useWallet } from '@/hooks/useWallet';
import { WalletService } from '@/service/Wallet';

export const SetupCreateSafe = () => {
  const { masterSafeAddress } = useWallet();
  const { backupSigner } = useSetupPage();
  const { goto } = usePageState();

  const [isCreatingSafe, setIsCreatingSafe] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (isCreatingSafe) return;
    setIsCreatingSafe(true);
    // TODO: add backup signer
    WalletService.createSafe(Chain.GNOSIS, backupSigner).catch((e) => {
      console.error(e);
      setIsError(true);
      message.error('Failed to create an account. Please try again later.');
    });
  }, [backupSigner, isCreatingSafe]);

  useEffect(() => {
    // Only progress is the safe is created and accessible via context (updates on interval)
    if (masterSafeAddress) goto(Pages.Main);
  }, [goto, masterSafeAddress]);

  return (
    <CardSection
      vertical
      align="center"
      justify="center"
      padding="80px 24px"
      gap={12}
    >
      {isError ? (
        <>
          <Image src="/broken-robot.svg" alt="logo" width={80} height={80} />
          <Typography.Text type="secondary" className="mt-12">
            Error, please contact{' '}
            <a target="_blank" href={SUPPORT_URL}>
              Olas community {UNICODE_SYMBOLS.EXTERNAL_LINK}
            </a>
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
            Creating account
          </Typography.Title>
          <Typography.Text type="secondary">
            You will be redirected once the account is created
          </Typography.Text>
        </>
      )}
    </CardSection>
  );
};
