import { Flex, Typography } from 'antd';

import { CustomAlert } from '@/components/Alert';
import { CardFlex } from '@/components/styled/CardFlex';
import { CardSection } from '@/components/styled/CardSection';
import { AgentHeader } from '@/components/ui/AgentHeader';
import { CrossChainTransferDetails } from '@/types/Bridge';

import { GetBridgeRequirementsParams } from '../types';
import { DepositForBridging } from './DepositForBridging';

const { Text, Title } = Typography;

const FROM_CHAIN_NAME = 'Ethereum';

const OnlySendFundsOnEthereumAlert = () => (
  <CardSection>
    <CustomAlert
      fullWidth
      type="warning"
      showIcon
      message={
        <Flex vertical gap={5}>
          <Text strong>Only send funds on Ethereum!</Text>
          <Text>
            Full amount of funds is required to initiate the bridging.
          </Text>
        </Flex>
      }
    />
  </CardSection>
);

type BridgeOnEvmProps = {
  bridgeFromDescription?: string;
  onPrev: () => void;
  onNext: () => void;
  getBridgeRequirementsParams: GetBridgeRequirementsParams;
  updateQuoteId: (quoteId: string) => void;
  updateCrossChainTransferDetails: (details: CrossChainTransferDetails) => void;
};

/**
 * Initial bridge component for the Ethereum network to show the deposit requirements
 * before proceeding with the bridging process.
 */
export const BridgeOnEvm = ({
  bridgeFromDescription,
  onPrev,
  onNext,
  getBridgeRequirementsParams,
  updateQuoteId,
  updateCrossChainTransferDetails,
}: BridgeOnEvmProps) => (
  <CardFlex $noBorder>
    <AgentHeader onPrev={onPrev} />

    <CardSection vertical gap={24} className="m-0 pt-24">
      <Flex vertical gap={8}>
        <Title level={3} className="m-0">
          Bridge from {FROM_CHAIN_NAME}
        </Title>
        <Text className="text-base text-lighter">{bridgeFromDescription}</Text>
      </Flex>

      <OnlySendFundsOnEthereumAlert />

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
