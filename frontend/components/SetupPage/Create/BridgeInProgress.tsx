import { Typography } from 'antd';
import { useEffect } from 'react';

import { CustomAlert } from '@/components/Alert';
import { BridgeTransferFlow } from '@/components/bridge/BridgeTransferFlow';
import { CardFlex } from '@/components/styled/CardFlex';
import { CardSection } from '@/components/styled/CardSection';
import { TOKEN_CONFIG } from '@/config/tokens';
import { ETHEREUM_OLAS_ADDRESS } from '@/constants/address';
import { SetupScreen } from '@/enums/SetupScreen';
import { TokenSymbol } from '@/enums/Token';
import { useSetup } from '@/hooks/useSetup';

import { SetupCreateHeader } from './SetupCreateHeader';

const { Text, Title } = Typography;

const isBridgingSuccess = false; // TODO: from the API

export const BridgeInProgress = () => {
  const { goto } = useSetup();

  useEffect(() => {
    if (isBridgingSuccess) {
      goto(SetupScreen.SetupCreateSafe);
    }
  }, [goto]);

  return (
    <CardFlex noBorder>
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
      <CardSection vertical gap={16} className="m-0">
        <BridgeTransferFlow
          fromChain="Ethereum"
          toChain="Base"
          transfers={[
            {
              fromAddress: ETHEREUM_OLAS_ADDRESS,
              fromAmount: ' 1000000000000000000',
              toAddress: TOKEN_CONFIG[42220][TokenSymbol.OLAS].address!,
              toAmount: '1200000000000000000',
            },
          ]}
        />
      </CardSection>
    </CardFlex>
  );
};
