import { useEffect, useState } from 'react';

import { Modal } from '@/components/ui';
import { useServices } from '@/hooks';

import { PolystratModalContent } from './ModalContent/Polystrat';
import { useCurrentAchievement } from './useCurrentAchievement';

export const AchievementModal = () => {
  const { getAgentTypeFromService } = useServices();
  const { currentAchievement, markCurrentAchievementAsShown } =
    useCurrentAchievement();

  const [showModal, setShowModal] = useState(false);

  const agentType = getAgentTypeFromService(
    currentAchievement?.serviceConfigId,
  );

  const handleClose = () => {
    setShowModal(false);
    markCurrentAchievementAsShown();
  };

  useEffect(() => {
    if (currentAchievement) {
      setShowModal(true);
    }
  }, [currentAchievement]);

  if (!currentAchievement) return null;

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
