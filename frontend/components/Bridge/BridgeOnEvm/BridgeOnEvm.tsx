import { Flex, Typography } from 'antd';

import { BackButton, CardFlex, FundingDescription } from '@/components/ui';
import { CHAIN_IMAGE_MAP, MiddlewareChain } from '@/constants';
import { useMasterWalletContext } from '@/hooks';
import { CrossChainTransferDetails } from '@/types/Bridge';
import { asEvmChainDetails } from '@/utils/middlewareHelpers';

import { GetBridgeRequirementsParams } from '../types';
import { DepositForBridging } from './DepositForBridging';

const { Text, Title } = Typography;

type BridgeOnEvmProps = {
  fromChain: MiddlewareChain;
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
  fromChain,
  bridgeToChain,
  onPrev,
  onNext,
  getBridgeRequirementsParams,
  updateQuoteId,
  updateCrossChainTransferDetails,
}: BridgeOnEvmProps) => {
  const { masterEoa } = useMasterWalletContext();
  // TODO: check if master safe exists once we support agents on From Chain
  const address = masterEoa?.address;

  const fromChainDetails = asEvmChainDetails(fromChain);
  const fromChainImage = CHAIN_IMAGE_MAP[fromChainDetails.chainId];

  return (
    <Flex justify="center">
      <CardFlex $noBorder $onboarding className="p-8">
        <BackButton onPrev={onPrev} />
        <Title level={3} className="mt-16">
          Bridge Crypto from {fromChainDetails.displayName}
        </Title>
        <Title level={5} className="mt-12 mb-8">
          Step 1. Send Funds
        </Title>
        <Text className="text-base text-lighter">
          Send the specified amounts from your external wallet to the Pearl
          Wallet address below. Pearl will automatically detect your transfer
          and bridge the funds for you.
        </Text>

        {address && (
          <FundingDescription
            address={address}
            chainName={fromChainDetails.displayName}
            chainImage={fromChainImage}
            isMainnet
            style={{ marginTop: 32 }}
          />
        )}

        <DepositForBridging
          fromChain={fromChain}
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
