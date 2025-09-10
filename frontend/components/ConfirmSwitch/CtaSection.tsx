import { CheckSquareFilled } from '@ant-design/icons';
import { Button, Flex, Image, Tag, Typography } from 'antd';
import { isEmpty, isNil } from 'lodash';
import { useMemo } from 'react';

import { CardFlex } from '@/components/ui/CardFlex';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { EvmChainName } from '@/constants/chains';
import { TokenSymbolMap } from '@/constants/token';
import {
  useBalanceContext,
  useMasterBalances,
} from '@/hooks/useBalanceContext';
import { useServices } from '@/hooks/useServices';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { InsufficientBalanceAlert } from './InsufficientBalanceAlert';

const { Text, Title } = Typography;

export const CtaSection = () => {
  const { isLoaded: isBalanceLoaded, totalStakedOlasBalance } =
    useBalanceContext();
  const { masterSafeBalances } = useMasterBalances();
  const { stakingProgramIdToMigrateTo } = useStakingProgram();
  const { selectedAgentConfig } = useServices();

  const { evmHomeChainId: homeChainId } = selectedAgentConfig;
  const chainName = EvmChainName[homeChainId];
  const minimumOlasRequiredToMigrate = useMemo(
    () =>
      STAKING_PROGRAMS[homeChainId][stakingProgramIdToMigrateTo!]
        ?.stakingRequirements[TokenSymbolMap.OLAS],
    [homeChainId, stakingProgramIdToMigrateTo],
  );
  const safeOlasBalance = useMemo(() => {
    if (!isBalanceLoaded) return 0;
    if (isNil(masterSafeBalances) || isEmpty(masterSafeBalances)) return 0;
    return masterSafeBalances.reduce(
      (acc, { evmChainId: chainId, symbol, balance }) => {
        if (chainId === homeChainId && symbol === TokenSymbolMap.OLAS)
          return acc + balance;
        return acc;
      },
      0,
    );
  }, [homeChainId, isBalanceLoaded, masterSafeBalances]);

  const totalOlas = safeOlasBalance + (totalStakedOlasBalance || 0);
  const hasEnoughOlasToMigrate = totalOlas >= minimumOlasRequiredToMigrate;
  const olasRequiredToMigrate = minimumOlasRequiredToMigrate - totalOlas;

  return (
    <>
      <CardFlex $noBorder className="mt-24">
        {!hasEnoughOlasToMigrate && (
          <InsufficientBalanceAlert
            olasBalance={totalOlas}
            requiredOlasBalance={olasRequiredToMigrate}
            chainName={chainName}
          />
        )}

        <Flex justify="space-between" align="center">
          <Flex vertical gap={8}>
            <Text type="secondary">Your OLAS balance</Text>
            <Flex gap={8} align="center">
              <Image
                src={'/tokens/olas-icon.png'}
                alt="OLAS"
                width={20}
                className="flex"
              />
              <Title level={5} className="my-0">
                {totalOlas.toFixed(2)} OLAS
              </Title>
              {hasEnoughOlasToMigrate && (
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
          <Button
            type="primary"
            size="large"
            disabled={!hasEnoughOlasToMigrate}
          >
            Confirm Switch
          </Button>
        </Flex>
      </CardFlex>
      <Text className="mt-16 text-sm text-center text-neutral-tertiary">
        Re-staking usually takes up to 5 min. Agent will be restarted during
        switching.
      </Text>
    </>
  );
};
