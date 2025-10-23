import { CheckSquareFilled } from '@ant-design/icons';
import { Flex, Tag, Typography } from 'antd';
import Image from 'next/image';

import { CardFlex } from '@/components/ui';
import { EvmChainName } from '@/constants';
import { useServices } from '@/hooks';

import { useShouldAllowStakingContractSwitch } from '../hooks/useShouldAllowStakingContractSwitch';
import { ConfirmSwitchButton } from './ConfirmSwitchButton';
import { InsufficientBalanceAlert } from './InsufficientBalanceAlert';

const { Text, Title } = Typography;

export const ConfirmSwitchSection = () => {
  const { selectedAgentConfig } = useServices();
  const { evmHomeChainId: homeChainId } = selectedAgentConfig;
  const chainName = EvmChainName[homeChainId];
  const { shouldAllowSwitch, olasRequiredToMigrate, totalOlas } =
    useShouldAllowStakingContractSwitch();

  return (
    <>
      <CardFlex $noBorder className="mt-24">
        {!shouldAllowSwitch && (
          <InsufficientBalanceAlert
            requiredOlasBalance={olasRequiredToMigrate}
            chainName={chainName}
          />
        )}

        <Flex justify="space-between" align="center">
          <Flex vertical gap={8}>
            <Text type="secondary">Your OLAS balance</Text>
            <Flex gap={8} align="center">
              <Image
                src="/tokens/olas-icon.png"
                alt="OLAS"
                width={20}
                height={20}
              />
              <Title level={5} className="my-0">
                {totalOlas.toFixed(2)} OLAS
              </Title>
              {shouldAllowSwitch && (
                <Tag
                  icon={<CheckSquareFilled />}
                  color="success"
                  className="ml-8"
                >
                  Ready to Switch
                </Tag>
              )}
            </Flex>
          </Flex>
          <ConfirmSwitchButton allowSwitch={shouldAllowSwitch} />
        </Flex>
      </CardFlex>

      <Text className="mt-16 text-sm text-center text-neutral-tertiary">
        Re-staking usually takes up to 5 min. Agent will be restarted during
        switching.
      </Text>
    </>
  );
};
