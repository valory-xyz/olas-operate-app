import { Flex, Typography } from 'antd';
import { useEffect, useMemo } from 'react';

import { CustomAlert } from '@/components/Alert';
import { getNativeTokenSymbol } from '@/config/tokens';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { TokenSymbol } from '@/enums/Token';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useNeedsFunds } from '@/hooks/useNeedsFunds';
import { useServices } from '@/hooks/useServices';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { InlineBanner } from './InlineBanner';
import { useLowFundsDetails } from './useLowFunds';

const { Text, Title } = Typography;

export const MainNeedsFunds = () => {
  const { selectedStakingProgramId } = useStakingProgram();

  const {
    hasEnoughEthForInitialFunding,
    hasEnoughOlasForInitialFunding,
    serviceFundRequirements,
    isInitialFunded,
    needsInitialFunding,
  } = useNeedsFunds(selectedStakingProgramId);

  const { selectedAgentConfig } = useServices();
  const { evmHomeChainId: homeChainId } = selectedAgentConfig;
  const nativeTokenSymbol = getNativeTokenSymbol(homeChainId);
  const { chainName, masterSafeAddress } = useLowFundsDetails();

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

  const olasRequired = useMemo(() => {
    if (hasEnoughOlasForInitialFunding) return null;
    const olas = serviceFundRequirements[homeChainId][TokenSymbol.OLAS];
    return `${UNICODE_SYMBOLS.OLAS}${olas} OLAS `;
  }, [homeChainId, hasEnoughOlasForInitialFunding, serviceFundRequirements]);

  const nativeTokenRequired = useMemo(() => {
    if (hasEnoughEthForInitialFunding) return null;
    const native = serviceFundRequirements[homeChainId][nativeTokenSymbol];
    return `${native} ${nativeTokenSymbol}`;
  }, [
    homeChainId,
    hasEnoughEthForInitialFunding,
    serviceFundRequirements,
    nativeTokenSymbol,
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

          <Text>
            To activate your agent, add these amounts on {chainName} chain to
            your safe:
          </Text>

          <Flex gap={0} vertical>
            {!hasEnoughOlasForInitialFunding && (
              <div>
                {UNICODE_SYMBOLS.BULLET} <Text strong>{olasRequired}</Text> -
                for staking.
              </div>
            )}
            {!hasEnoughEthForInitialFunding && (
              <div>
                {UNICODE_SYMBOLS.BULLET}{' '}
                <Text strong>{nativeTokenRequired}</Text> - for trading.
              </div>
            )}
          </Flex>

          {masterSafeAddress && (
            <InlineBanner
              text="Your safe address"
              address={masterSafeAddress}
            />
          )}
        </Flex>
      }
      type="primary"
    />
  );
};
