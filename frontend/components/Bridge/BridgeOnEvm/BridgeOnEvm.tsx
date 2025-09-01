import { Flex, Typography } from 'antd';

import { FundingDescription } from '@/components/SetupPage/FundYourAgent/components/FundingDescription';
import { CardFlex } from '@/components/styled/CardFlex';
import { BackButton } from '@/components/ui/BackButton';
import { Title4 } from '@/components/ui/Typography/Title4';
import { Title5 } from '@/components/ui/Typography/Title5';
import { CrossChainTransferDetails } from '@/types/Bridge';

import { GetBridgeRequirementsParams } from '../types';
import { DepositForBridging } from './DepositForBridging';

const { Text } = Typography;

const FROM_CHAIN_NAME = 'Ethereum';
const FROM_CHAIN_IMAGE = '/chains/ethereum-chain.png';

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
  <Flex justify="center" style={{ marginTop: 40 }}>
    <CardFlex $noBorder style={{ width: 624, padding: 8 }}>
      <BackButton onPrev={onPrev} />
      <Title4 className="mt-24">Bridge Crypto from {FROM_CHAIN_NAME}</Title4>
      <Title5 className="mt-12 mb-8">Step 1. Send Funds</Title5>
      <Text className="text-base text-lighter">{bridgeFromDescription}</Text>

      <FundingDescription
        chainName={FROM_CHAIN_NAME}
        chainImage={FROM_CHAIN_IMAGE}
        isMainnet
      />

      <DepositForBridging
        getBridgeRequirementsParams={getBridgeRequirementsParams}
        updateQuoteId={updateQuoteId}
        updateCrossChainTransferDetails={updateCrossChainTransferDetails}
        onNext={onNext}
      />
    </CardFlex>
  </Flex>
);
