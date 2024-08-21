import { Flex, Typography } from 'antd';
import { formatUnits } from 'ethers/lib/utils';
import { ReactNode, useEffect, useMemo } from 'react';
import styled from 'styled-components';

import { CustomAlert } from '@/components/Alert';
import { CHAINS } from '@/constants/chains';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { useBalance } from '@/hooks/useBalance';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useServiceTemplates } from '@/hooks/useServiceTemplates';
import { useStore } from '@/hooks/useStore';
import { getMinimumStakedAmountRequired } from '@/utils/service';

import { CardSection } from '../../styled/CardSection';

const { Text } = Typography;
const COVER_PREV_BLOCK_BORDER_STYLE = { marginTop: '-1px' };

const FundingValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  line-height: 32px;
  letter-spacing: -0.72px;
`;

const useNeedsFunds = () => {
  const { getServiceTemplates } = useServiceTemplates();

  const serviceTemplate = useMemo(
    () => getServiceTemplates()[0],
    [getServiceTemplates],
  );

  const { storeState } = useStore();
  const { safeBalance, totalOlasStakedBalance } = useBalance();

  const isInitialFunded = storeState?.isInitialFunded;

  const serviceFundRequirements = useMemo(() => {
    const monthlyGasEstimate = Number(
      formatUnits(
        `${serviceTemplate.configurations[CHAINS.GNOSIS.chainId].monthly_gas_estimate}`,
        18,
      ),
    );

    const minimumStakedAmountRequired =
      getMinimumStakedAmountRequired(serviceTemplate);

    return {
      eth: monthlyGasEstimate,
      olas: minimumStakedAmountRequired,
    };
  }, [serviceTemplate]);

  const hasEnoughEthForInitialFunding = useMemo(
    () => (safeBalance?.ETH || 0) >= (serviceFundRequirements?.eth || 0),
    [serviceFundRequirements?.eth, safeBalance],
  );

  const hasEnoughOlasForInitialFunding = useMemo(() => {
    const olasInSafe = safeBalance?.OLAS || 0;
    const olasStakedBySafe = totalOlasStakedBalance || 0;

    const olasInSafeAndStaked = olasInSafe + olasStakedBySafe;

    return olasInSafeAndStaked >= serviceFundRequirements.olas;
  }, [
    safeBalance?.OLAS,
    totalOlasStakedBalance,
    serviceFundRequirements?.olas,
  ]);

  return {
    hasEnoughEthForInitialFunding,
    hasEnoughOlasForInitialFunding,
    serviceFundRequirements,
    isInitialFunded,
  };
};

export const MainNeedsFunds = () => {
  const { isBalanceLoaded } = useBalance();
  const {
    hasEnoughEthForInitialFunding,
    hasEnoughOlasForInitialFunding,
    serviceFundRequirements,
    isInitialFunded,
  } = useNeedsFunds();

  const electronApi = useElectronApi();

  const isVisible: boolean = useMemo(() => {
    if (isInitialFunded) return false;
    if (!isBalanceLoaded) return false;
    if (hasEnoughEthForInitialFunding && hasEnoughOlasForInitialFunding)
      return false;
    return true;
  }, [
    hasEnoughEthForInitialFunding,
    hasEnoughOlasForInitialFunding,
    isBalanceLoaded,
    isInitialFunded,
  ]);

  const message: ReactNode = useMemo(
    () => (
      <Flex vertical gap={16}>
        <Text className="font-weight-600">Your agent needs funds</Text>
        <Flex gap={24}>
          {!hasEnoughOlasForInitialFunding && (
            <div>
              <FundingValue>{`${UNICODE_SYMBOLS.OLAS}${serviceFundRequirements.olas} OLAS `}</FundingValue>
              <span className="text-sm">for staking</span>
            </div>
          )}
          {!hasEnoughEthForInitialFunding && (
            <div>
              <FundingValue>
                {`$${serviceFundRequirements.eth} XDAI `}
              </FundingValue>
              <span className="text-sm">for trading</span>
            </div>
          )}
        </Flex>
        <ul className="p-0 m-0 text-sm">
          <li>Do not add more than these amounts.</li>
          <li>Use the address in the “Add Funds” section below.</li>
        </ul>
      </Flex>
    ),
    [
      serviceFundRequirements,
      hasEnoughEthForInitialFunding,
      hasEnoughOlasForInitialFunding,
    ],
  );

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

  if (!isVisible) return null;

  return (
    <CardSection style={COVER_PREV_BLOCK_BORDER_STYLE}>
      <CustomAlert showIcon message={message} type="primary" fullWidth />
    </CardSection>
  );
};
