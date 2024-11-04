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

import { AccountIsSetup } from '@/client';
import { Pages } from '@/enums/PageState';
import { SetupScreen } from '@/enums/SetupScreen';
import { useBalance } from '@/hooks/useBalance';
import { useElectronApi } from '@/hooks/useElectronApi';
import { usePageState } from '@/hooks/usePageState';
import { useSetup } from '@/hooks/useSetup';
import { useWallet } from '@/hooks/useWallet';
import { AccountService } from '@/service/Account';

import { FormFlex } from '../styled/FormFlex';

const { Title } = Typography;

export const SetupWelcome = () => {
  const electronApi = useElectronApi();
  const [isSetup, setIsSetup] = useState<AccountIsSetup | null>(null);

  useEffect(() => {
    if (isSetup !== null) return;
    setIsSetup(AccountIsSetup.Loading);

    AccountService.getAccount()
      .then((res) => {
        switch (res.is_setup) {
          case true:
            setIsSetup(AccountIsSetup.True);
            break;
          case false: {
            // Reset persistent state
            // if creating new account
            electronApi.store?.clear?.();
            setIsSetup(AccountIsSetup.False);
            break;
          }
          default:
            setIsSetup(AccountIsSetup.Error);
            break;
        }
      })
      .catch((e) => {
        console.error(e);
        setIsSetup(AccountIsSetup.Error);
      });
  }, [electronApi.store, isSetup]);

  const welcomeScreen = useMemo(() => {
    switch (isSetup) {
      case AccountIsSetup.True:
        return <SetupWelcomeLogin />;
      case AccountIsSetup.False:
        return <SetupWelcomeCreate />;
      case AccountIsSetup.Loading:
        return (
          <Flex
            justify="center"
            align="center"
            style={{ height: 140, marginBottom: 32 }}
          >
            <Spin />
          </Flex>
        );
      case AccountIsSetup.Error:
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
  const { goto } = useSetup();
  const { goto: gotoPage } = usePageState();

  const { masterSafeAddress, wallets } = useWallet();
  const { isBalanceLoaded, masterEoaBalance: eoaBalance } = useBalance();

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [canNavigate, setCanNavigate] = useState(false);

  const [form] = Form.useForm();

  const handleLogin = useCallback(
    async ({ password }: { password: string }) => {
      setIsLoggingIn(true);
      AccountService.loginAccount(password)
        .then(() => {
          setCanNavigate(true);
        })
        .catch((e) => {
          console.error(e);
          setIsLoggingIn(false);
          message.error('Invalid password');
        });
    },
    [],
  );

  useEffect(() => {
    // Navigate only when wallets and balances are loaded
    // To check if some setup steps were missed
    if (canNavigate && wallets?.length && isBalanceLoaded) {
      setIsLoggingIn(false);
      if (!eoaBalance?.ETH) {
        goto(SetupScreen.SetupEoaFundingIncomplete);
      } else if (!masterSafeAddress) {
        goto(SetupScreen.SetupCreateSafe);
      } else {
        gotoPage(Pages.Main);
      }
    }
  }, [
    canNavigate,
    eoaBalance?.ETH,
    goto,
    gotoPage,
    isBalanceLoaded,
    masterSafeAddress,
    wallets?.length,
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
