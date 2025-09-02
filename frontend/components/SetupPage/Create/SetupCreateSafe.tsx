import { Card, message, Typography } from 'antd';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { MiddlewareChain } from '@/client';
import { CardSection } from '@/components/styled/CardSection';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { SUPPORT_URL } from '@/constants/urls';
import { Pages } from '@/enums/Pages';
import { useBackupSigner } from '@/hooks/useBackupSigner';
import { useMultisigs } from '@/hooks/useMultisig';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { WalletService } from '@/service/Wallet';
import { delayInSeconds } from '@/utils/delay';
import { asEvmChainDetails, asEvmChainId } from '@/utils/middlewareHelpers';

const { Text, Title } = Typography;

const YouWillBeRedirected = ({ text }: { text: string }) => (
  <>
    <Image src="/onboarding-robot.svg" alt="logo" width={80} height={80} />
    <Title
      level={4}
      className="m-0 mt-12 loading-ellipses"
      style={{ width: 'fit-content' }}
    >
      {text}
    </Title>
    <Text type="secondary">
      You will be redirected once the account is created.
    </Text>
  </>
);

const CreationError = () => (
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
);

export const SetupCreateSafe = () => {
  const { goto } = usePageState();
  const {
    masterSafes,
    refetch: updateWallets,
    isFetched: isWalletsFetched,
  } = useMasterWalletContext();
  const { masterSafesOwnersIsLoading } = useMultisigs(masterSafes);
  const backupSignerAddress = useBackupSigner();

  // current service template
  const { selectedAgentType } = useServices();
  const serviceTemplate = SERVICE_TEMPLATES.find(
    (template) => template.agentType === selectedAgentType,
  );

  // state for creating safes
  const [isCreatingSafe, setIsCreatingSafe] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const masterSafeAddress = useMemo(() => {
    if (!masterSafes) return;
    return masterSafes.find(
      (safe) => safe.evmChainId === asEvmChainId(serviceTemplate?.home_chain),
    );
  }, [masterSafes, serviceTemplate?.home_chain]);

  const createSafeWithRetries = useCallback(
    async (middlewareChain: MiddlewareChain, retries: number) => {
      for (let attempt = retries; attempt > 0; attempt--) {
        try {
          // Attempt to create the safe
          await WalletService.createSafe(middlewareChain, backupSignerAddress);

          // Update wallets and handle successful creation
          await updateWallets?.();
          setIsFailed(false);
          setIsSuccess(true);
          break; // Exit the loop once successful
        } catch (e) {
          console.error(e);
          if (attempt === 1) {
            setIsFailed(true);
            setIsSuccess(false);
            throw new Error(`Failed to create safe on ${middlewareChain}`);
          } else {
            // Retry delay
            message.error(
              `Failed to create account, retrying in 5 seconds... (${attempt - 1} retries left)`,
            );
            await delayInSeconds(5);
          }
        }
      }
    },
    [backupSignerAddress, updateWallets],
  );

  const creationStatusText = useMemo(() => {
    if (isCreatingSafe) return 'Creating accounts';
    if (isSuccess) return 'Account created';
    return 'Account creation in progress';
  }, [isCreatingSafe, isSuccess]);

  useEffect(() => {
    if (
      /**
       * Avoid creating safes if any of the following conditions are met:
       */
      isFailed || // creation failed - it's retried in background
      isCreatingSafe || // already creating a safe
      !isWalletsFetched || // wallets are not loaded yet
      // backup address is not loaded yet.
      // Note: the only case when it can be null forever is when the user closed the app
      // after entering the backup wallet but before creating a first safe
      masterSafesOwnersIsLoading
    )
      return;

    const chainsToCreateSafesFor = serviceTemplate
      ? Object.keys(serviceTemplate.configurations)
      : null;

    const safeCreationsRequired = chainsToCreateSafesFor
      ? chainsToCreateSafesFor.reduce((acc, chain) => {
          const safeAddressAlreadyExists = masterSafes?.find(
            (safe) => safe.evmChainId === asEvmChainId(chain),
          );
          if (!safeAddressAlreadyExists) {
            const middlewareChain = chain as MiddlewareChain;
            acc.push(middlewareChain);
          }
          return acc;
        }, [] as MiddlewareChain[])
      : [];

    (async () => {
      for (const middlewareChain of safeCreationsRequired) {
        setIsCreatingSafe(true);
        const displayName = asEvmChainDetails(middlewareChain).displayName;
        try {
          await createSafeWithRetries(middlewareChain, 3);
          message.success(`${displayName} account created`);
        } catch (e) {
          message.warning(`Failed to create ${displayName} account`);
          console.error(e);
        }
      }
    })().then(() => {
      setIsCreatingSafe(false);
    });
  }, [
    backupSignerAddress,
    createSafeWithRetries,
    isCreatingSafe,
    isFailed,
    isWalletsFetched,
    masterSafes,
    masterSafesOwnersIsLoading,
    serviceTemplate,
  ]);

  // Only progress is the safe is created and accessible via context (updates on timeout)
  useEffect(() => {
    if (masterSafeAddress) {
      delayInSeconds(2).then(() => {
        goto(Pages.Main);
      });
    }
  }, [masterSafeAddress, goto]);

  return (
    <Card bordered={false}>
      <CardSection
        vertical
        align="center"
        justify="center"
        $padding="80px 24px"
        gap={12}
      >
        {isFailed ? (
          <CreationError />
        ) : (
          <YouWillBeRedirected text={creationStatusText} />
        )}
      </CardSection>
    </Card>
  );
};
