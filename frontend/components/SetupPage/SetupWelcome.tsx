import {
  Button,
  Card,
  Flex,
  Form,
  Input,
  message,
  Spin,
  Typography,
} from 'antd';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { MiddlewareAccountIsSetup } from '@/client';
import { Pages } from '@/enums/Pages';
import { SetupScreen } from '@/enums/SetupScreen';
import {
  useBalanceContext,
  useMasterBalances,
} from '@/hooks/useBalanceContext';
import { useElectronApi } from '@/hooks/useElectronApi';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useSetup } from '@/hooks/useSetup';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { AccountService } from '@/service/Account';
import { asEvmChainId, asMiddlewareChain } from '@/utils/middlewareHelpers';

import { FormFlex } from '../styled/FormFlex';

const { Title } = Typography;

export const SetupWelcome = () => {
  const electronApi = useElectronApi();
  const [isSetup, setIsSetup] = useState<MiddlewareAccountIsSetup | null>(null);

  useEffect(() => {
    if (isSetup !== null) return;
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
  }, [electronApi.store, isSetup]);

  const welcomeScreen = useMemo(() => {
    switch (isSetup) {
      case MiddlewareAccountIsSetup.True:
        return <SetupWelcomeLogin />;
      case MiddlewareAccountIsSetup.False:
        return <SetupWelcomeCreate />;
      case MiddlewareAccountIsSetup.Loading:
        return (
          <Flex
            justify="center"
            align="center"
            style={{ height: 140, marginBottom: 32 }}
          >
            <Spin />
          </Flex>
        );
      case MiddlewareAccountIsSetup.Error:
        return (
          <Flex
            justify="center"
            style={{ margin: '32px 0', textAlign: 'center' }}
          >
            <Typography.Text>
              Unable to determine the account setup status, please try again.
            </Typography.Text>
          </Flex>
        );
      default:
        return null;
    }
  }, [isSetup]);

  return (
    <Card bordered={false}>
      <Flex vertical align="center">
        <Image
          src={'/onboarding-robot.svg'}
          alt="Onboarding Robot"
          width={80}
          height={80}
        />
        <Title>Pearl</Title>
      </Flex>
      {welcomeScreen}
    </Card>
  );
};

export const SetupWelcomeCreate = () => {
  const { goto } = useSetup();

  return (
    <Flex vertical gap={10}>
      <Button
        color="primary"
        type="primary"
        size="large"
        onClick={() => goto(SetupScreen.SetupPassword)}
      >
        Create account
      </Button>
      <Button size="large" disabled>
        Restore access
      </Button>
    </Flex>
  );
};

export const SetupWelcomeLogin = () => {
  const [form] = Form.useForm();
  const { goto } = useSetup();
  const { goto: gotoPage, setUserLoggedIn } = usePageState();

  const {
    selectedService,
    selectedAgentConfig,
    services,
    isFetched: isServicesFetched,
    selectedAgentType,
  } = useServices();
  const {
    masterSafes,
    masterEoa,
    isFetched: isWalletsFetched,
  } = useMasterWalletContext();
  const { isLoaded: isBalanceLoaded, updateBalances } = useBalanceContext();
  const { masterWalletBalances } = useMasterBalances();

  const selectedServiceOrAgentChainId = selectedService?.home_chain
    ? asEvmChainId(selectedService?.home_chain)
    : selectedAgentConfig.evmHomeChainId;

  const masterSafe = masterSafes?.find(
    (safe) =>
      selectedServiceOrAgentChainId &&
      safe.evmChainId === selectedServiceOrAgentChainId,
  );

  const eoaBalanceEth = masterWalletBalances?.find(
    (balance) =>
      balance.walletAddress === masterEoa?.address &&
      balance.evmChainId === selectedServiceOrAgentChainId,
  )?.balance;

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [canNavigate, setCanNavigate] = useState(false);

  const handleLogin = useCallback(
    async ({ password }: { password: string }) => {
      setIsLoggingIn(true);
      AccountService.loginAccount(password)
        .then(async () => {
          await updateBalances();
          setCanNavigate(true);
          setUserLoggedIn();
        })
        .catch((e) => {
          console.error(e);
          message.error('Invalid password');
        })
        .finally(() => {
          setIsLoggingIn(false);
        });
    },
    [updateBalances, setUserLoggedIn],
  );

  const isServiceCreatedForAgent = useMemo(() => {
    if (!isServicesFetched) return false;
    if (!services) return false;
    if (!selectedService) return false;
    if (!selectedAgentConfig) return false;

    return services.some(
      (service) =>
        service.home_chain ===
        asMiddlewareChain(selectedAgentConfig.evmHomeChainId),
    );
  }, [isServicesFetched, services, selectedService, selectedAgentConfig]);

  useEffect(() => {
    if (!canNavigate) return;
    if (!isServicesFetched) return;
    if (!isWalletsFetched) return;
    if (!isBalanceLoaded) return;

    setIsLoggingIn(false);

    if (!selectedAgentConfig) return;

    // If the agent is disabled then redirect to agent selection,
    // if the disabled agent was previously selected.
    if (!selectedAgentConfig.isAgentEnabled) {
      goto(SetupScreen.AgentSelection);
      return;
    }

    // If no service is created for the selected agent
    if (!isServiceCreatedForAgent) {
      window.console.log(
        `No service created for chain ${selectedServiceOrAgentChainId}`,
      );
      goto(SetupScreen.AgentSelection);
      return;
    }

    // If no balance is loaded, redirect to setup screen
    if (!eoaBalanceEth) {
      goto(SetupScreen.SetupEoaFundingIncomplete);
      return;
    }

    // if master safe is NOT created, then go to create safe
    if (!masterSafe?.address) {
      goto(SetupScreen.SetupCreateSafe);
      return;
    }

    gotoPage(Pages.Main);
  }, [
    canNavigate,
    isServicesFetched,
    isWalletsFetched,
    isBalanceLoaded,
    isServiceCreatedForAgent,
    eoaBalanceEth,
    masterSafe?.address,
    selectedServiceOrAgentChainId,
    goto,
    gotoPage,
    selectedAgentConfig,
    selectedAgentType,
  ]);

  return (
    <FormFlex form={form} onFinish={handleLogin}>
      <Form.Item
        name="password"
        rules={[{ required: true, message: 'Please input your Password!' }]}
      >
        <Input.Password size="large" placeholder="Password" />
      </Form.Item>
      <Flex vertical gap={10}>
        <Button
          htmlType="submit"
          type="primary"
          size="large"
          loading={isLoggingIn}
        >
          Login
        </Button>
        <Button
          type="link"
          target="_blank"
          size="small"
          onClick={() => goto(SetupScreen.Restore)}
        >
          Forgot password? Restore access
        </Button>
      </Flex>
    </FormFlex>
  );
};
