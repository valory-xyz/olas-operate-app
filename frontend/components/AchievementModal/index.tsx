import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { Modal } from '@/components/ui';
import { AgentMap } from '@/constants';
import { useServices } from '@/hooks';

import { useCurrentAchievement } from './hooks/useCurrentAchievement';
import { useTriggerAchievementBackgroundTasks } from './hooks/useTriggerAchievementBackgroundTasks';
import { PolystratModalContent } from './ModalContent/Polystrat';

const ConfettiAnimation = dynamic(
  () =>
    import('@/components/ui/animations/ConfettiAnimation').then(
      (mod) => mod.ConfettiAnimation,
    ),
  { ssr: false },
);

export const AchievementModal = () => {
  const { getAgentTypeFromService } = useServices();
  const {
    currentAchievement,
    markCurrentAchievementAsShown,
    isLoading,
    isError,
  } = useCurrentAchievement();
  const triggerAchievementBackgroundTasks =
    useTriggerAchievementBackgroundTasks();

  const [showModal, setShowModal] = useState(false);

  const agentType = getAgentTypeFromService(
    currentAchievement?.serviceConfigId,
  );

  const handleClose = () => {
    markCurrentAchievementAsShown();
    setShowModal(false);
  };

  useEffect(() => {
    if (!currentAchievement) return;

    triggerAchievementBackgroundTasks(currentAchievement);
    setShowModal(true);
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
          {agentType === AgentMap.Polystrat ? (
            <PolystratModalContent achievement={currentAchievement} />
          ) : null}
        </>
      }
    />
  );
};
