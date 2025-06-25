import { Flex, Typography } from 'antd';

import { CustomAlert } from '@/components/Alert';
import { DepositForBridging } from '@/components/bridge/DepositForBridging';
import { CardFlex } from '@/components/styled/CardFlex';
import { CardSection } from '@/components/styled/CardSection';
import { AgentHeader } from '@/components/ui/AgentHeader';
import { CrossChainTransferDetails } from '@/types/Bridge';

import { GetBridgeRequirementsParams } from './types';

const { Text, Title } = Typography;

const FROM_CHAIN_NAME = 'Ethereum';

const AlertMessage = () => (
  <Flex vertical gap={5}>
    <Text strong>Only send funds on Ethereum!</Text>
    <Text>Full amount of funds is required to initiate the bridging.</Text>
  </Flex>
);

type BridgeOnEvmProps = {
  bridgeFromMessage?: string;
  onPrev: () => void;
  onNext: () => void;
  getBridgeRequirementsParams: GetBridgeRequirementsParams;
  updateQuoteId: (quoteId: string) => void;
  updateCrossChainTransferDetails: (details: CrossChainTransferDetails) => void;
};

export const BridgeOnEvm = ({
  bridgeFromMessage,
  onPrev,
  onNext,
  getBridgeRequirementsParams,
  updateQuoteId,
  updateCrossChainTransferDetails,
}: BridgeOnEvmProps) => (
  <CardFlex $noBorder>
    <AgentHeader prev={onPrev} />

    <CardSection vertical gap={24} className="m-0 pt-24">
      <Flex vertical gap={8}>
        <Title level={3} className="m-0">
          Bridge from {FROM_CHAIN_NAME}
        </Title>
        <Text className="text-base text-lighter">{bridgeFromMessage}</Text>
      </Flex>

      <CardSection>
        <CustomAlert
          fullWidth
          type="warning"
          showIcon
          message={<AlertMessage />}
        />
      </CardSection>

      <DepositForBridging
        chainName={FROM_CHAIN_NAME}
        getBridgeRequirementsParams={getBridgeRequirementsParams}
        updateQuoteId={updateQuoteId}
        updateCrossChainTransferDetails={updateCrossChainTransferDetails}
        onNext={onNext}
      />
    </CardSection>
  </CardFlex>
);
