import { Flex, Typography } from 'antd';
import { ReactNode, useEffect, useMemo } from 'react';
import styled from 'styled-components';

import { CustomAlert } from '@/components/Alert';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useNeedsFunds } from '@/hooks/useNeedsFunds';

import { CardSection } from '../../styled/CardSection';

const { Text } = Typography;
const COVER_PREV_BLOCK_BORDER_STYLE = { marginTop: '-1px' };

const FundingValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  line-height: 32px;
  letter-spacing: -0.72px;
`;

export const MainNeedsFunds = () => {
  const {
    hasEnoughEthForInitialFunding,
    hasEnoughOlasForInitialFunding,
    serviceFundRequirements,
    isInitialFunded,
    needsInitialFunding,
  } = useNeedsFunds();

  const electronApi = useElectronApi();

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

  if (!needsInitialFunding) return null;

  return (
    <CardSection style={COVER_PREV_BLOCK_BORDER_STYLE}>
      <CustomAlert showIcon message={message} type="primary" fullWidth />
    </CardSection>
  );
};
