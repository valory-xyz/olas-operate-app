import { Flex, Typography } from 'antd';
import { useMemo } from 'react';

import { Progress } from '@/components/ui/Progress';
import { COLOR } from '@/constants/colors';
import { StakingContractDetails } from '@/types/Autonolas';

const { Text } = Typography;

export const SlotsLeft = ({
  contractDetails,
  isCurrentStakingProgram,
}: {
  contractDetails: Partial<StakingContractDetails> | undefined;
  isCurrentStakingProgram: boolean;
}) => {
  const maxSlots = contractDetails?.maxNumServices;
  const slotsLeft =
    maxSlots && contractDetails?.serviceIds
      ? maxSlots - contractDetails.serviceIds.length
      : 0;
  const slotPercentage = useMemo(() => {
    return maxSlots && contractDetails?.serviceIds
      ? (contractDetails.serviceIds.length / maxSlots) * 100
      : 0;
  }, [contractDetails, maxSlots]);
  return (
    <Flex vertical className="px-24 pt-24 mt-16">
      <Flex align="center" justify="space-between">
        <Text type="secondary" className="text-sm text-neutral-tertiary">
          Slots left
        </Text>
        <Text className="text-sm text-neutral-tertiary">
          {slotsLeft} / {maxSlots}
        </Text>
      </Flex>
      <Progress
        percent={slotPercentage}
        strokeColor={
          isCurrentStakingProgram ? COLOR.TEXT_NEUTRAL_TERTIARY : COLOR.PURPLE
        }
        trailColor={COLOR.GRAY_3}
        showInfo={false}
      />
    </Flex>
  );
};
