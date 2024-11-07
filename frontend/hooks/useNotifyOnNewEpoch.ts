import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { useEffect, useState } from 'react';

import { SERVICE_STAKING_TOKEN_MECH_USAGE_ABI } from '@/abis/serviceStakingTokenMechUsage';
import { gnosisProvider } from '@/constants/providers';
import { getLatestEpochDetails } from '@/graphql/queries';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useServices } from '@/hooks/useServices';
import { useStakingProgram } from '@/hooks/useStakingProgram';

type EpochStatusNotification = {
  lastEpoch: number;
  isNotified: boolean;
};

type EventData = {
  value: string; // Adjust based on your event's structure
};

type UseContractEventReturn = EventData | null;

const useContractEvent = (eventName: string): UseContractEventReturn => {
  const { activeStakingProgramAddress } = useStakingProgram();
  const [eventData, setEventData] = useState<UseContractEventReturn>(null);

  useEffect(() => {
    if (!activeStakingProgramAddress) return;

    const signer = gnosisProvider.getSigner();

    // Set up the contract instance
    const contract = new ethers.Contract(
      activeStakingProgramAddress,
      SERVICE_STAKING_TOKEN_MECH_USAGE_ABI,
      signer,
    );

    // Event handler
    const handleEvent = (value: string) => {
      console.log('Event data:', value);
      setEventData({ value });
    };

    // Listen for the event
    contract.on(eventName, handleEvent);

    // Cleanup the event listener when the component unmounts
    return () => {
      contract.off(eventName, handleEvent);
    };
  }, [activeStakingProgramAddress, eventName]);

  return eventData;
};

const useNewEpochEvent = () => {
  const { activeStakingProgramAddress } = useStakingProgram();

  const { data: epoch } = useQuery({
    queryKey: ['latestEpochTime'],
    queryFn: async () => {
      return await getLatestEpochDetails(activeStakingProgramAddress as string);
    },
    select: (data) => Number(data.epoch),
    enabled: !!activeStakingProgramAddress,
  });

  return epoch;
};

/**
 * Hook to notify the user when a new epoch is started
 * and agent is not running.
 */
export const useNotifyOnNewEpoch = () => {
  const { showNotification } = useElectronApi();
  const { isServiceNotRunning } = useServices();
  const epoch = useNewEpochEvent();
  const eventInfo = useContractEvent('Checkpoint');

  console.log('eventInfo', eventInfo);

  const [epochStatusNotification, setEpochStatusNotification] =
    useState<EpochStatusNotification | null>(null);

  useEffect(() => {
    // if agent is running, no need to show notification
    if (!isServiceNotRunning) return;

    // latest epoch is not loaded yet
    if (!epoch) return;

    // first time, just load the epoch status
    if (!epochStatusNotification) {
      setEpochStatusNotification({ lastEpoch: epoch, isNotified: false });
      return;
    }

    // already notified for this epoch
    if (epochStatusNotification.isNotified) return;

    // if latest epoch is not the last notified epoch
    if (epochStatusNotification.lastEpoch !== epoch) {
      showNotification?.(
        'Start your agent to avoid missing rewards and getting evicted.',
      );

      setEpochStatusNotification({ lastEpoch: epoch, isNotified: true });
    }
  }, [isServiceNotRunning, epochStatusNotification, epoch, showNotification]);
};
