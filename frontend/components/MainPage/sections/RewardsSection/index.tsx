import { Button, Flex, Modal, Skeleton, Tag, Typography } from 'antd';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useBalance } from '@/hooks/useBalance';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useReward } from '@/hooks/useReward';
import { useStore } from '@/hooks/useStore';
import { balanceFormat } from '@/utils/numberFormatters';

import { ConfettiAnimation } from '../../../Confetti/ConfettiAnimation';
import { CardSection } from '../../../styled/CardSection';
import { RewardsStreak } from './RewardsStreak';
import { StakingRewardsThisEpoch } from './StakingRewardsThisEpoch';

const { Text, Title } = Typography;

const Loader = () => (
  <Flex vertical gap={8}>
    <Skeleton.Button active size="small" style={{ width: 92 }} />
    <Skeleton.Button active size="small" style={{ width: 92 }} />
  </Flex>
);

const getFormattedReward = (reward: number | undefined) =>
  reward === undefined ? '--' : `~${balanceFormat(reward, 2)}`;

const DisplayRewards = () => {
  const { availableRewardsForEpochEth, isEligibleForRewards } = useReward();
  const { isBalanceLoaded } = useBalance();

  const reward = getFormattedReward(availableRewardsForEpochEth);

  return (
    <CardSection vertical gap={8} padding="16px 24px" align="start">
      <StakingRewardsThisEpoch />
      {isBalanceLoaded ? (
        <Flex align="center" gap={12}>
          <Text className="text-xl font-weight-600">{reward} OLAS&nbsp;</Text>
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

const NotifyRewardsModal = () => {
  const { isEligibleForRewards, availableRewardsForEpochEth } = useReward();
  const { totalOlasBalance } = useBalance();
  const { showNotification, store } = useElectronApi();
  const { storeState } = useStore();

  const [canShowNotification, setCanShowNotification] = useState(false);

  const firstRewardRef = useRef<number>();

  // hook to set the flag to show the notification
  useEffect(() => {
    if (!isEligibleForRewards) return;
    if (!storeState) return;
    if (storeState?.firstRewardNotificationShown) return;
    if (!availableRewardsForEpochEth) return;

    firstRewardRef.current = availableRewardsForEpochEth;
    setCanShowNotification(true);
  }, [isEligibleForRewards, availableRewardsForEpochEth, storeState]);

  // hook to show desktop app notification
  useEffect(() => {
    if (!canShowNotification) return;

    const reward = getFormattedReward(firstRewardRef.current);
    showNotification?.(
      'First rewards earned!',
      `Congratulations! Your agent just got the first reward for you! Your current balance: ${reward} OLAS`,
    );
  }, [canShowNotification, showNotification]);

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

export const RewardsSection = () => (
  <>
    <DisplayRewards />
    <RewardsStreak />
    <NotifyRewardsModal />
  </>
);
