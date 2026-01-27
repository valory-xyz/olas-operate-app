import { useEffect, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { Modal } from '@/components/ui';
import { ConfettiAnimation } from '@/components/ui/animations';
import { useServices } from '@/hooks';

import { useCurrentAchievement } from './hooks/useCurrentAchievement';
import { useTriggerAchievementBackgroundTasks } from './hooks/useTriggerAchievementBackgroundTasks';
import { PolystratModalContent } from './ModalContent/Polystrat';

export const AchievementModal = () => {
  const { getAgentTypeFromService } = useServices();
  const {
    currentAchievement,
    markCurrentAchievementAsShown,
    isLoading,
    error,
    isError,
  } = useCurrentAchievement();
  const triggerAchievementBackgroundTasks =
    useTriggerAchievementBackgroundTasks();

  const [showModal, setShowModal] = useState(false);

  const agentType = getAgentTypeFromService(
    currentAchievement?.serviceConfigId,
  );

  const handleClose = () => {
    setShowModal(false);
    markCurrentAchievementAsShown();
  };

  useEffect(() => {
    if (isError && error) {
      console.error('Failed to fetch achievements:', error);
    }
  }, [isError, error]);

  useEffect(() => {
    if (!currentAchievement) return;

    setShowModal(true);
    triggerAchievementBackgroundTasks(currentAchievement);
  }, [currentAchievement, triggerAchievementBackgroundTasks]);

  useUnmount(() => {
    setShowModal(false);
  });

  if (isLoading || isError) return null;
  if (!currentAchievement || !agentType) return null;

  return (
    <Modal
      open={showModal}
      onCancel={handleClose}
      closable
      size="medium"
      action={
        <>
          <ConfettiAnimation loop={false} />
          {agentType === 'polymarket_trader' ? (
            <PolystratModalContent achievement={currentAchievement} />
          ) : null}
        </>
      }
    />
  );
};
