import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { Modal } from '@/components/ui';
import { ACHIEVEMENT_TYPE, AgentMap, AgentType } from '@/constants';
import { useServices } from '@/hooks';
import { Achievement } from '@/types/Achievement';
import { Nullable } from '@/types/Util';

import { useCurrentAchievement } from './hooks/useCurrentAchievement';
import { useTriggerAchievementBackgroundTasks } from './hooks/useTriggerAchievementBackgroundTasks';
import {
  PredictionPayout,
  PredictionPayoutAgent,
} from './ModalContent/PredictionPayout';

const ConfettiAnimation = dynamic(
  () =>
    import('@/components/ui/animations/ConfettiAnimation').then(
      (mod) => mod.ConfettiAnimation,
    ),
  { ssr: false },
);

const PAYOUT_ACHIEVEMENT_TYPE_BY_AGENT: Record<
  PredictionPayoutAgent,
  Achievement['achievement_type']
> = {
  [AgentMap.PredictTrader]: ACHIEVEMENT_TYPE.OMENSTRAT_PAYOUT,
  [AgentMap.Polystrat]: ACHIEVEMENT_TYPE.POLYSTRAT_PAYOUT,
};

const isPayoutAgent = (
  agentType: Nullable<AgentType>,
): agentType is PredictionPayoutAgent =>
  !!agentType && agentType in PAYOUT_ACHIEVEMENT_TYPE_BY_AGENT;

const getPayoutAgentType = (
  agentType: Nullable<AgentType>,
  achievementType?: Achievement['achievement_type'],
): Nullable<PredictionPayoutAgent> => {
  if (!isPayoutAgent(agentType)) return null;
  if (PAYOUT_ACHIEVEMENT_TYPE_BY_AGENT[agentType] !== achievementType)
    return null;
  return agentType;
};

export const AchievementModal = () => {
  const { getAgentTypeFromService } = useServices();
  const {
    currentAchievement,
    markCurrentAchievementAsShown,
    skipCurrentAchievement,
    isLoading,
    isError,
  } = useCurrentAchievement();
  const { triggerAchievementBackgroundTasks, areBackgroundTasksFinalized } =
    useTriggerAchievementBackgroundTasks();

  const [showModal, setShowModal] = useState(false);

  const agentType = getAgentTypeFromService(
    currentAchievement?.serviceConfigId,
  );

  const payoutAgentType = getPayoutAgentType(
    agentType,
    currentAchievement?.achievement_type,
  );

  const handleClose = () => {
    markCurrentAchievementAsShown();
    setShowModal(false);
  };

  useEffect(() => {
    if (!currentAchievement || !agentType) return;

    if (!payoutAgentType) {
      skipCurrentAchievement();
      return;
    }

    triggerAchievementBackgroundTasks(currentAchievement);
    setShowModal(true);
  }, [
    currentAchievement,
    agentType,
    payoutAgentType,
    markCurrentAchievementAsShown,
    skipCurrentAchievement,
    triggerAchievementBackgroundTasks,
  ]);

  useUnmount(() => {
    setShowModal(false);
  });

  if (isLoading || isError) return null;
  if (!currentAchievement || !payoutAgentType) return null;

  return (
    <Modal
      open={showModal}
      onCancel={handleClose}
      closable
      size="medium"
      action={
        <>
          <ConfettiAnimation loop={false} />
          <PredictionPayout
            agentType={payoutAgentType}
            achievement={currentAchievement}
            onShare={handleClose}
            areBackgroundTasksFinalized={areBackgroundTasksFinalized}
          />
        </>
      }
    />
  );
};
