import { Flex, Typography } from 'antd';
import { useEffect } from 'react';

import { CustomAlert } from '@/components/Alert';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useNeedsFunds } from '@/hooks/useNeedsFunds';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { FundsToActivate } from './FundsToActivate';

const { Title } = Typography;

export const MainNeedsFunds = () => {
  const { selectedStakingProgramId } = useStakingProgram();

  const {
    hasEnoughEthForInitialFunding,
    hasEnoughOlasForInitialFunding,
    isInitialFunded,
    needsInitialFunding,
  } = useNeedsFunds(selectedStakingProgramId);

  // update the store when the agent is funded
  const electronApi = useElectronApi();
  useEffect(() => {
    if (
      hasEnoughEthForInitialFunding &&
      hasEnoughOlasForInitialFunding &&
      !isInitialFunded
    ) {
      electronApi.store?.set?.('isInitialFunded', true);
    }
  }, [
    electronApi.store,
    hasEnoughEthForInitialFunding,
    hasEnoughOlasForInitialFunding,
    isInitialFunded,
  ]);

  if (!needsInitialFunding) return null;

  return (
    <CustomAlert
      fullWidth
      showIcon
      message={
        <Flex vertical gap={8} align="flex-start">
          <Title level={5} style={{ margin: 0 }}>
            Fund your agent
          </Title>

          <FundsToActivate
            stakingFundsRequired={!hasEnoughOlasForInitialFunding}
            tradingFundsRequired={!hasEnoughEthForInitialFunding}
          />
        </Flex>
      }
      type="primary"
    />
  );
};
