import { Typography } from 'antd';
import { useEffect } from 'react';

import { CustomAlert } from '@/components/Alert';
import { BridgeTransferFlow } from '@/components/bridge/BridgeTransferFlow';
import { BridgingSteps } from '@/components/bridge/BridgingSteps';
import { CardFlex } from '@/components/styled/CardFlex';
import { CardSection } from '@/components/styled/CardSection';
import { SetupScreen } from '@/enums/SetupScreen';
import { TokenSymbol } from '@/enums/Token';
import { useSetup } from '@/hooks/useSetup';

import { SetupCreateHeader } from './SetupCreateHeader';

const { Text, Title } = Typography;

const isBridgingSuccess = false; // TODO: from the API

const Header = () => (
  <>
    <SetupCreateHeader />
    <Title level={3} className="mb-16">
      Bridging in progress
    </Title>
    <CustomAlert
      type="warning"
      fullWidth
      showIcon
      style={{ margin: '0 -24px 16px -24px' }}
      message={
        <Text className="text-sm">
          Keep the app open until bridging is complete.
        </Text>
      }
    />
  </>
);

// TODO: integrate with the API
const useBridgeTransferFlow = () => {
  return {
    fromChain: 'Ethereum',
    toChain: 'Base',
    transfers: [
      {
        fromSymbol: TokenSymbol.ETH,
        fromAmount: '1000000000000000000',
        toSymbol: TokenSymbol.ETH,
        toAmount: '1200000000000000000',
      },
      {
        fromSymbol: TokenSymbol.OLAS,
        fromAmount: '1000000000000000000',
        toSymbol: TokenSymbol.OLAS,
        toAmount: '1200000000000000000',
      },
    ],
  };
};

/**
 * Bridge in progress screen.
 */
export const BridgeInProgress = () => {
  const { goto } = useSetup();

  const { fromChain, toChain, transfers } = useBridgeTransferFlow();

  useEffect(() => {
    if (isBridgingSuccess) {
      goto(SetupScreen.SetupCreateSafe);
    }
  }, [goto]);

  return (
    <CardFlex noBorder>
      <Header />
      <CardSection vertical gap={16} className="m-0">
        <BridgeTransferFlow
          fromChain={fromChain}
          toChain={toChain}
          transfers={transfers}
        />
        <BridgingSteps />
      </CardSection>
    </CardFlex>
  );
};
