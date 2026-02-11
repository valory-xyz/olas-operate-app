import { Button, Card, Flex, Form, Input, Spin, Typography } from 'antd';
import { isNil } from 'lodash';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { PAGES, SETUP_SCREEN } from '@/constants';
import { useMessageApi } from '@/context/MessageProvider';
import {
  useBackupSigner,
  useBalanceContext,
  useElectronApi,
  useMasterBalances,
  useMnemonicExists,
  useOnlineStatusContext,
  usePageState,
  useServices,
  useSetup,
  useSharedContext,
} from '@/hooks';
import { AccountService } from '@/service/Account';
import { WalletService } from '@/service/Wallet';
import { asEvmChainId, getErrorMessage } from '@/utils';

import { FormFlex } from '../ui/FormFlex';
import { FormLabel } from '../ui/Typography';
import { SetupWelcomeCreate } from './SetupWelcomeCreate';

const { Title, Text } = Typography;

type UseSetupNavigationProps = {
  canNavigate: boolean;
  setIsLoggingIn: (loading: boolean) => void;
};

const useSetupNavigation = ({
  canNavigate,
  setIsLoggingIn,
}: UseSetupNavigationProps) => {
  const { goto } = useSetup();
  const { goto: gotoPage } = usePageState();
  const { isOnline } = useOnlineStatusContext();
  const {
    selectedService,
    selectedAgentConfig,
    services,
    isFetched: isServicesFetched,
  } = useServices();
  const { getMasterEoaNativeBalanceOf, isLoaded } = useMasterBalances();
  const backupSignerAddress = useBackupSigner();

  const selectedServiceOrAgentChainId = selectedService?.home_chain
    ? asEvmChainId(selectedService?.home_chain)
    : selectedAgentConfig.evmHomeChainId;

  const isServiceCreatedForAgent = useMemo(() => {
    if (!isServicesFetched) return false;
    if (!services) return false;
    if (!selectedService) return false;
    if (!selectedAgentConfig) return false;

    return services.some(
      ({ service_public_id, home_chain }) =>
        service_public_id === selectedAgentConfig.servicePublicId &&
        home_chain === selectedAgentConfig.middlewareHomeChainId,
    );
  }, [isServicesFetched, services, selectedService, selectedAgentConfig]);

  const isApplicationReady = useMemo(() => {
    if (!isOnline || !canNavigate || !isServicesFetched || !isLoaded)
      return false;

    return true;
  }, [canNavigate, isLoaded, isOnline, isServicesFetched]);

  const isBackupWalletNotSet = useMemo(() => {
    // If no services are created and backup wallet is not set as well.
    return !services?.length && !backupSignerAddress;
  }, [services?.length, backupSignerAddress]);

  useEffect(() => {
    if (!isApplicationReady) return;
    setIsLoggingIn(false);

    if (!selectedAgentConfig) return;

    if (isBackupWalletNotSet) {
      goto(SETUP_SCREEN.SetupBackupSigner);
      return;
    }

    // If the agent is disabled then redirect to agent selection,
    // if the disabled agent was previously selected.
    if (!selectedAgentConfig.isAgentEnabled) {
      goto(SETUP_SCREEN.AgentOnboarding);
      return;
    }

    // If no service is created for the selected agent
    if (!isServiceCreatedForAgent) {
      goto(SETUP_SCREEN.AgentOnboarding);
      return;
    }

    // If no balance is loaded, redirect to setup screen
    if (isNil(getMasterEoaNativeBalanceOf(selectedServiceOrAgentChainId))) {
      goto(SETUP_SCREEN.FundYourAgent);
      return;
    }

    gotoPage(PAGES.Main);
  }, [
    getMasterEoaNativeBalanceOf,
    goto,
    gotoPage,
    isApplicationReady,
    isBackupWalletNotSet,
    isServiceCreatedForAgent,
    selectedAgentConfig,
    selectedServiceOrAgentChainId,
    setIsLoggingIn,
  ]);
};

enum MiddlewareAccountIsSetup {
  True,
  False,
  Loading,
  Error,
  RecoveryNotComplete,
}

const WelcomeBack = () => (
  <Flex vertical align="center" gap={12} style={{ margin: '24px 0 40px 0' }}>
    <Title level={3} className="m-0">
      Welcome Back to Pearl
    </Title>
    <Text type="secondary">Sign in to your account to proceed.</Text>
  </Flex>
);

const SetupLoader = () => (
  <Flex
    justify="center"
    align="center"
    style={{ height: 140, marginBottom: 32 }}
  >
    <Spin />
  </Flex>
);

const SetupError = () => (
  <Flex justify="center" style={{ margin: '32px 0', textAlign: 'center' }}>
    <Text>Unable to determine the account setup status, please try again.</Text>
  </Flex>
);

const RecoveryProcessInProgress = () => (
  <Flex justify="center" style={{ margin: '32px 0', textAlign: 'center' }}>
    <Text>
      Account recovery was in progress but could not be completed. Please open a
      support ticket.
    </Text>
  </Flex>
);

const ErrorMessages = ['does not exist', 'file does not exist', 'not exist'];

const SetupWelcomeLogin = () => {
  const [form] = Form.useForm();
  const message = useMessageApi();
  const { goto } = useSetup();
  const { setUserLoggedIn } = usePageState();
  const { setMnemonicExists } = useMnemonicExists();

  const { updateBalances } = useBalanceContext();

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [canNavigate, setCanNavigate] = useState(false);
  useSetupNavigation({ canNavigate, setIsLoggingIn });

  const handleLogin = useCallback(
    async ({ password }: { password: string }) => {
      setIsLoggingIn(true);
      try {
        await AccountService.loginAccount(password);

        try {
          await WalletService.getRecoverySeedPhrase(password);
          setMnemonicExists(true);
        } catch (e: unknown) {
          const errorMsg = getErrorMessage(e, '').toLowerCase();
          if (
            errorMsg.includes('mnemonic') &&
            ErrorMessages.some((message) => errorMsg.includes(message))
          ) {
            setMnemonicExists(false);
          }
        }

        await updateBalances();
        setCanNavigate(true);
        setUserLoggedIn();
      } catch (e) {
        message.error(getErrorMessage(e));
      } finally {
        setIsLoggingIn(false);
      }
    },
    [updateBalances, setUserLoggedIn, message, setMnemonicExists],
  );

  return (
    <Flex vertical>
      <WelcomeBack />

      <FormFlex form={form} onFinish={handleLogin} layout="vertical">
        <Form.Item
          name="password"
          label={<FormLabel>Enter password</FormLabel>}
          rules={[{ required: true, message: 'Please input your Password.' }]}
          required={false}
          labelCol={{ style: { paddingBottom: 4 } }}
        >
          <Input.Password size="large" />
        </Form.Item>

        <Flex vertical gap={10}>
          <Button
            htmlType="submit"
            type="primary"
            size="large"
            loading={isLoggingIn}
          >
            Continue
          </Button>
          <Button
            type="link"
            target="_blank"
            size="small"
            onClick={() => goto(SETUP_SCREEN.AccountRecovery)}
          >
            Forgot password?
          </Button>
        </Flex>
      </FormFlex>
    </Flex>
  );
};

/**
 * Setup screen for creating or logging into an account
 */
export const SetupWelcome = () => {
  const electronApi = useElectronApi();
  const { isAccountRecoveryStatusLoading, hasActiveRecoverySwap } =
    useSharedContext();
  const [isSetup, setIsSetup] = useState<MiddlewareAccountIsSetup | null>(null);
  const [hasCheckedAccount, setHasCheckedAccount] = useState(false);

  useEffect(() => {
    // Wait for account recovery status to load
    if (isAccountRecoveryStatusLoading) {
      setIsSetup(MiddlewareAccountIsSetup.Loading);
      return;
    }

    // If already checked or determined the setup state, don't check again
    if (
      hasCheckedAccount ||
      (isSetup !== null && isSetup !== MiddlewareAccountIsSetup.Loading)
    ) {
      return;
    }

    if (hasActiveRecoverySwap) {
      setIsSetup(MiddlewareAccountIsSetup.RecoveryNotComplete);
      setHasCheckedAccount(true);
      return;
    }

    // Mark as checked and set loading state before making API call
    setHasCheckedAccount(true);
    setIsSetup(MiddlewareAccountIsSetup.Loading);

    AccountService.getAccount()
      .then((res) => {
        switch (res.is_setup) {
          case true:
            setIsSetup(MiddlewareAccountIsSetup.True);
            break;
          case false: {
            // Reset persistent state
            // if creating new account
            electronApi.store?.clear?.();
            setIsSetup(MiddlewareAccountIsSetup.False);
            break;
          }
          default:
            setIsSetup(MiddlewareAccountIsSetup.Error);
            break;
        }
      })
      .catch((e) => {
        console.error(e);
        setIsSetup(MiddlewareAccountIsSetup.Error);
      });
  }, [
    electronApi.store,
    isSetup,
    hasCheckedAccount,
    isAccountRecoveryStatusLoading,
    hasActiveRecoverySwap,
  ]);

  const welcomeScreen = useMemo(() => {
    switch (isSetup) {
      case MiddlewareAccountIsSetup.True:
        return <SetupWelcomeLogin />;
      case MiddlewareAccountIsSetup.False:
        return <SetupWelcomeCreate />;
      case MiddlewareAccountIsSetup.Loading:
        return <SetupLoader />;
      case MiddlewareAccountIsSetup.RecoveryNotComplete:
        return <RecoveryProcessInProgress />;
      case MiddlewareAccountIsSetup.Error:
        return <SetupError />;
      default:
        return null;
    }
  }, [isSetup]);

  return (
    <Card variant="borderless">
      <Flex vertical align="center">
        <Image
          src="/onboarding-robot.svg"
          alt="Onboarding Pearl"
          width={64}
          height={64}
        />
      </Flex>
      {welcomeScreen}
    </Card>
  );
};
