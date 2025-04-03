import { Typography } from 'antd';
import { useEffect } from 'react';

import { CustomAlert } from '@/components/Alert';
import { BridgeTransferFlow } from '@/components/bridge/BridgeTransferFlow';
import { CardFlex } from '@/components/styled/CardFlex';
import { CardSection } from '@/components/styled/CardSection';
import { SetupScreen } from '@/enums/SetupScreen';
import { TokenSymbol } from '@/enums/Token';
import { useSetup } from '@/hooks/useSetup';

import { SetupCreateHeader } from './SetupCreateHeader';

const { Text, Title } = Typography;

const KeepAppOpenAlert = () => (
  <CustomAlert
    type="warning"
    fullWidth
    showIcon
    message={
      <Text className="text-sm">
        Keep the app open until bridging is complete.
      </Text>
    }
  />
);

const BridgeInProgressHeader = () => (
  <>
    <SetupCreateHeader />
    <Title level={3} className="m-0">
      Bridging in progress
    </Title>
  </>
);

// TODO: integrate with the API
const useBridgeTransfers = () => {
  return {
    fromChain: 'Ethereum',
    toChain: 'Base',
    transfers: [
      {
        fromSymbol: TokenSymbol.OLAS,
        fromAmount: '100000000000000000000',
        toSymbol: TokenSymbol.OLAS,
        toAmount: '100000000000000000000',
      },
      {
        fromSymbol: TokenSymbol.ETH,
        fromAmount: '5500000000000000',
        toSymbol: TokenSymbol.ETH,
        toAmount: '5000000000000000',
      },
    ],
  };
};

/**
 * Bridge in progress screen.
 */
export const BridgeInProgress = () => {
  const { goto } = useSetup();
  const { fromChain, toChain, transfers } = useBridgeTransfers();

  const isBridgingSuccess = false; // TODO: from the API
  useEffect(() => {
    if (isBridgingSuccess) {
      goto(SetupScreen.SetupCreateSafe);
    }
  }, [isBridgingSuccess, goto]);

  return (
    <>
      <CardFlex $noBorder $gap={20} $padding="0 24px">
        <BridgeInProgressHeader />
      </CardFlex>

      <KeepAppOpenAlert />

      <CardSection vertical gap={16} className="m-0">
        <BridgeTransferFlow
          fromChain={fromChain}
          toChain={toChain}
          transfers={transfers}
        />
      </CardSection>
    </>
  );
};
