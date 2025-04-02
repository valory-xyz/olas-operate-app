import { Typography } from 'antd';
import { useEffect } from 'react';

import { CustomAlert } from '@/components/Alert';
import { BridgeSteps } from '@/components/bridge/BridgeTransferFlow';
import { CardFlex } from '@/components/styled/CardFlex';
import { CardSection } from '@/components/styled/CardSection';
import { SetupScreen } from '@/enums/SetupScreen';
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
      <SetupCreateHeader prev={SetupScreen.SetupEoaFunding} />
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
        <BridgeSteps />
      </CardSection>
    </CardFlex>
  );
};
