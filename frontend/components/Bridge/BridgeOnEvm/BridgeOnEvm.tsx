import { Flex, Typography } from 'antd';

import { BackButton, CardFlex, FundingDescription } from '@/components/ui';
import { MiddlewareChain } from '@/constants';
import { useMasterWalletContext } from '@/hooks';
import { CrossChainTransferDetails } from '@/types/Bridge';

import { GetBridgeRequirementsParams } from '../types';
import { DepositForBridging } from './DepositForBridging';

const { Text, Title } = Typography;

const FROM_CHAIN_NAME = 'Ethereum';
const FROM_CHAIN_IMAGE = '/chains/ethereum-chain.png';

type BridgeOnEvmProps = {
  bridgeFromDescription?: string;
  bridgeToChain: MiddlewareChain;
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
  bridgeToChain,
  onPrev,
  onNext,
  getBridgeRequirementsParams,
  updateQuoteId,
  updateCrossChainTransferDetails,
}: BridgeOnEvmProps) => {
  const { masterEoa } = useMasterWalletContext();
  // TODO check if master safe exists once we support agents on To Chain
  const address = masterEoa?.address;

  return (
    <Flex justify="center">
      <CardFlex $noBorder $onboarding className="p-8">
        <BackButton onPrev={onPrev} />
        <Title level={3} className="mt-16">
          Bridge Crypto from {FROM_CHAIN_NAME}
        </Title>
        <Title level={5} className="mt-12 mb-8">
          Step 1. Send Funds
        </Title>
        <Text className="text-base text-lighter">{bridgeFromDescription}</Text>

        {address && (
          <FundingDescription
            address={address}
            chainName={FROM_CHAIN_NAME}
            chainImage={FROM_CHAIN_IMAGE}
            isMainnet
            style={{ marginTop: 32 }}
          />
        )}

        <DepositForBridging
          bridgeToChain={bridgeToChain}
          getBridgeRequirementsParams={getBridgeRequirementsParams}
          updateQuoteId={updateQuoteId}
          updateCrossChainTransferDetails={updateCrossChainTransferDetails}
          onNext={onNext}
        />
      </CardFlex>
    </Flex>
  );
};
