import { CloseOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Card, Flex, message, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { DeploymentStatus } from '@/client';
import { FAQ_URL, SUPPORT_URL } from '@/constants';
import { UNICODE_SYMBOLS } from '@/constants/unicode';
import { PageState } from '@/enums';
import { useBalance, usePageState, useServices } from '@/hooks';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useMasterSafe } from '@/hooks/useMasterSafe';
import { useStore } from '@/hooks/useStore';

import { CardTitle } from '../common/CardTitle';
import { CardSection } from '../styled/CardSection';

const { Title, Paragraph } = Typography;

const SettingsTitle = () => (
  <CardTitle
    title={
      <Flex gap={10}>
        <QuestionCircleOutlined />
        Help & support
      </Flex>
    }
  />
);

export const HelpAndSupport = () => {
  const { goto } = usePageState();
  const { saveLogs, openPath } = useElectronApi();

  const { storeState } = useStore();
  const {
    serviceStatus,
    services,
    hasInitialLoaded: isServiceLoaded,
  } = useServices();
  const {
    isBalanceLoaded,
    totalEthBalance,
    totalOlasBalance,
    wallets,
    walletBalances,
    totalOlasStakedBalance,
  } = useBalance();

  const {
    backupSafeAddress,
    masterSafeAddress,
    masterEoaAddress,
    masterSafeOwners,
  } = useMasterSafe();

  const [isLoading, setIsLoading] = useState(false);
  const [canSaveLogs, setCanSafeLogs] = useState(false);

  const onSaveLogs = useCallback(() => {
    setIsLoading(true);
    setCanSafeLogs(true);
  }, []);

  const handleSaveLogs = useCallback(() => {
    return saveLogs?.({
      store: storeState,
      debugData: {
        services: {
          services:
            services?.map((item) => ({
              ...item,
              keys: item.keys.map((key) => key.address),
            })) ?? 'undefined',
          serviceStatus: serviceStatus
            ? DeploymentStatus[serviceStatus]
            : 'undefined',
        },
        addresses: [
          { backupSafeAddress: backupSafeAddress ?? 'undefined' },
          { masterSafeAddress: masterSafeAddress ?? 'undefined' },
          { masterEoaAddress: masterEoaAddress ?? 'undefined' },
          { masterSafeOwners: masterSafeOwners ?? 'undefined' },
        ],
        balances: [
          { wallets: wallets ?? 'undefined' },
          { walletBalances: walletBalances ?? 'undefined' },
          { totalOlasStakedBalance: totalOlasStakedBalance ?? 'undefined' },
          { totalEthBalance: totalEthBalance ?? 'undefined' },
          { totalOlasBalance: totalOlasBalance ?? 'undefined' },
        ],
      },
    }).then((result) => {
      if (result.success) {
        message.success({
          content: (
            <span>
              Logs saved to:
              <Button
                type="link"
                size="small"
                onClick={() => {
                  openPath?.(`${result.dirPath}`);
                }}
              >
                {result.dirPath}
              </Button>
            </span>
          ),
          duration: 10,
        });
      } else {
        message.error('Save logs failed or cancelled');
      }
    });
  }, [
    backupSafeAddress,
    masterEoaAddress,
    masterSafeAddress,
    masterSafeOwners,
    openPath,
    saveLogs,
    serviceStatus,
    services,
    storeState,
    totalEthBalance,
    totalOlasBalance,
    totalOlasStakedBalance,
    walletBalances,
    wallets,
  ]);

  useEffect(() => {
    // only save logs when all needed data is loaded
    if (canSaveLogs && isBalanceLoaded && isServiceLoaded) {
      handleSaveLogs()?.finally(() => {
        setIsLoading(false);
        setCanSafeLogs(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSaveLogs, isBalanceLoaded, isServiceLoaded]);

  return (
    <Card
      title={<SettingsTitle />}
      bordered={false}
      extra={
        <Button
          size="large"
          icon={<CloseOutlined />}
          onClick={() => goto(PageState.Main)}
        />
      }
    >
      <CardSection borderbottom="true" padding="16px 24px 24px" vertical>
        <Title level={5} className="m-0 mb-16 text-base">
          Frequently asked questions
        </Title>
        <a target="_blank" href={FAQ_URL}>
          Read FAQ {UNICODE_SYMBOLS.EXTERNAL_LINK}
        </a>
      </CardSection>

      <CardSection borderbottom="true" padding="16px 24px 24px" vertical>
        <Title level={5} className="m-0 mb-8 text-base">
          Ask for help
        </Title>
        <Paragraph type="secondary" className="mb-16 text-sm">
          Get your questions answered by the community.
        </Paragraph>
        <a target="_blank" href={SUPPORT_URL}>
          Olas community Discord server {UNICODE_SYMBOLS.EXTERNAL_LINK}
        </a>
      </CardSection>

      <CardSection padding="16px 24px 24px" vertical align="start">
        <Title level={5} className="m-0 mb-16 text-base ">
          Export logs for troubleshooting
        </Title>
        <Button
          type="primary"
          ghost
          size="large"
          loading={isLoading}
          onClick={onSaveLogs}
        >
          Export logs
        </Button>
      </CardSection>
    </Card>
  );
};
