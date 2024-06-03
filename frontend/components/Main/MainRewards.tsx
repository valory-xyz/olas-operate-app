import { InfoCircleOutlined } from '@ant-design/icons';
import { Button, Flex, Modal, Skeleton, Tag, Tooltip, Typography } from 'antd';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import { balanceFormat } from '@/common-util';
import { useBalance } from '@/hooks';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useReward } from '@/hooks/useReward';
import { useStore } from '@/hooks/useStore';

import { ConfettiAnimation } from '../common/ConfettiAnimation';
import { CardSection } from '../styled/CardSection';

const { Text, Title, Paragraph } = Typography;

const Loader = () => (
  <Flex vertical gap={8}>
    <Skeleton.Button active size="small" style={{ width: 92 }} />
    <Skeleton.Button active size="small" style={{ width: 92 }} />
  </Flex>
);

const DisplayRewards = () => {
  const { availableRewardsForEpochEth, isEligibleForRewards } = useReward();
  const { isBalanceLoaded } = useBalance();

  return (
    <CardSection vertical gap={8} padding="16px 24px" align="start">
      <Text type="secondary">
        Staking rewards this work period&nbsp;
        <Tooltip
          arrow={false}
          title={
            <Paragraph className="text-sm m-0">
              The agent&apos;s working period lasts at least 24 hours, but its
              start and end point may not be at the same time every day.
            </Paragraph>
          }
        >
          <InfoCircleOutlined />
        </Tooltip>
      </Text>
      {isBalanceLoaded ? (
        <Flex align="center" gap={12}>
          <Text className="text-xl font-weight-600">
            {balanceFormat(availableRewardsForEpochEth, 2)} OLAS&nbsp;
          </Text>
          {isEligibleForRewards ? (
            <Tag color="success">Earned</Tag>
          ) : (
            <Tag color="processing">Not yet earned</Tag>
          )}
        </Flex>
      ) : (
        <Loader />
      )}
    </CardSection>
  );
};

const SHARE_TEXT = `I just earned my first reward through the Operate app powered by #olas!\n\nDownload the Pearl app:`;
const OPERATE_URL = 'https://olas.network/operate?pearl=first-reward';

const NotifyRewards = () => {
  const { isEligibleForRewards, availableRewardsForEpochEth } = useReward();
  const { totalOlasBalance } = useBalance();
  const { showNotification, store } = useElectronApi();
  const { storeState } = useStore();

  const [canShowNotification, setCanShowNotification] = useState(false);

  // hook to set the flag to show the notification
  useEffect(() => {
    if (!isEligibleForRewards) return;
    if (!storeState) return;
    if (storeState?.firstRewardNotificationShown) return;
    if (!availableRewardsForEpochEth) return;

    setCanShowNotification(true);
  }, [
    isEligibleForRewards,
    availableRewardsForEpochEth,
    showNotification,
    storeState,
  ]);

  // hook to show desktop app notification
  useEffect(() => {
    if (!canShowNotification) return;

    showNotification?.(
      'Your agent earned its first staking rewards!',
      `Congratulations! Your agent just got the first reward for you! Your current balance: ${availableRewardsForEpochEth} OLAS`,
    );
  }, [canShowNotification, availableRewardsForEpochEth, showNotification]);

  const closeNotificationModal = useCallback(() => {
    setCanShowNotification(false);

    // once the notification is closed, set the flag to true
    store?.set?.('firstRewardNotificationShown', true);
  }, [store]);

  const onTwitterShare = useCallback(() => {
    const encodedText = encodeURIComponent(SHARE_TEXT);
    const encodedURL = encodeURIComponent(OPERATE_URL);

    window.open(
      `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedURL}`,
      '_blank',
    );
  }, []);

  if (!canShowNotification) return null;

  return (
    <Modal
      open={canShowNotification}
      width={400}
      onCancel={closeNotificationModal}
      footer={[
        <Button
          key="back"
          type="primary"
          block
          size="large"
          className="mt-8"
          onClick={onTwitterShare}
        >
          <Flex align="center" justify="center" gap={2}>
            Share on
            <Image
              src="/twitter.svg"
              width={24}
              height={24}
              alt="Share on twitter"
            />
          </Flex>
        </Button>,
      ]}
    >
      <ConfettiAnimation />

      <Flex align="center" justify="center">
        <Image
          src="/splash-robot-head.png"
          width={100}
          height={100}
          alt="OLAS logo"
        />
      </Flex>

      <Title level={5} className="mt-12">
        Your agent just earned the first reward!
      </Title>

      <Flex vertical gap={16}>
        <Text>
          Congratulations! Your agent just earned the first
          <Text strong>
            {` ${balanceFormat(availableRewardsForEpochEth, 2)} OLAS `}
          </Text>
          for you!
        </Text>

        <Text>
          Your current balance:
          <Text strong>{` ${balanceFormat(totalOlasBalance, 2)} OLAS `}</Text>
        </Text>

        <Text>Keep it running to get even more!</Text>
      </Flex>
    </Modal>
  );
};

export const MainRewards = () => (
  <>
    <DisplayRewards />
    <NotifyRewards />
  </>
);
