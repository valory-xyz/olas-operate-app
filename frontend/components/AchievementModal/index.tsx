import { useEffect, useState } from 'react';

import { Modal } from '@/components/ui';
import { useServices } from '@/hooks';

import { useCurrentAchievement } from './hooks/useCurrentAchievement';
import { useTriggerAchievementBackgroundTasks } from './hooks/useTriggerAchievementBackgroundTasks';
import { PolystratModalContent } from './ModalContent/Polystrat';

export const AchievementModal = () => {
  const { getAgentTypeFromService } = useServices();
  const { currentAchievement, markCurrentAchievementAsShown } =
    useCurrentAchievement();
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
    if (!currentAchievement) return;

    setShowModal(true);
    triggerAchievementBackgroundTasks(currentAchievement);
  }, [currentAchievement, triggerAchievementBackgroundTasks]);

  if (!currentAchievement || !agentType) return null;

  return (
    <Modal
      open={showModal}
      onCancel={handleClose}
      closable
      size="medium"
      action={
        agentType === 'polymarket_trader' ? (
          <PolystratModalContent achievement={currentAchievement} />
        ) : null
      }
    />
  );
};
