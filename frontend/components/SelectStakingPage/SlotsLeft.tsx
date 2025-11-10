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
  const { maxNumServices = 0, serviceIds = [] } = contractDetails ?? {};

  const { slotsLeft, slotPercentage } = useMemo(() => {
    const usedSlots = serviceIds.length;
    const slotsLeft = maxNumServices - usedSlots;
    const slotPercentage =
      maxNumServices > 0 ? (usedSlots / maxNumServices) * 100 : 0;
    return { slotsLeft, slotPercentage };
  }, [maxNumServices, serviceIds]);
  return (
    <Flex vertical className="px-24 pt-24 mt-16">
      <Flex align="center" justify="space-between">
        <Text type="secondary" className="text-sm text-neutral-tertiary">
          Slots left
        </Text>
        <Text className="text-sm text-neutral-tertiary">
          {slotsLeft} / {maxNumServices}
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
