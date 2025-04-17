import { Button, Typography } from 'antd';

import { DepositForBridging } from '@/components/bridge/DepositForBridging';
import { CardFlex } from '@/components/styled/CardFlex';
import { CardSection } from '@/components/styled/CardSection';
import { SetupScreen } from '@/enums/SetupScreen';
import { TokenSymbol } from '@/enums/Token';
import { CrossChainTransferDetails } from '@/types/Bridge';

import { SetupCreateHeader } from '../SetupCreateHeader';

const { Text, Title } = Typography;

const FROM_CHAIN_NAME = 'Ethereum';

type BridgeOnEvmProps = {
  onNext: () => void;
  updateQuoteId: (quoteId: string) => void;
  updateCrossChainTransferDetails: (details: CrossChainTransferDetails) => void;
};

export const BridgeOnEvm = ({
  onNext,
  updateQuoteId,
  updateCrossChainTransferDetails,
}: BridgeOnEvmProps) => {
  // TODO: only the "is_refill_required" is true, move to next page and pass the quote_id
  // and the amount of the funds that are transferred.
  // TODO: remove after automatic redirection to the next page
  const handleNext = () => {
    updateQuoteId('quoteId');
    updateCrossChainTransferDetails({
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
    });
    onNext();
  };

  return (
    <CardFlex $noBorder>
      <SetupCreateHeader prev={SetupScreen.SetupEoaFunding} />

      <CardSection vertical gap={16} className="m-0 pt-24">
        <Title level={3} className="m-0">
          Bridge from {FROM_CHAIN_NAME}
        </Title>
        <Text className="text-base">
          The bridged amount covers all funds required to create your account
          and run your agent, including fees. No further funds will be needed.
        </Text>

        <DepositForBridging
          chainName={FROM_CHAIN_NAME}
          updateQuoteId={updateQuoteId}
          updateCrossChainTransferDetails={updateCrossChainTransferDetails}
          onNext={onNext}
        />
        {/* TODO: remove after automatic redirection to the next page */}
        <Button onClick={handleNext} block type="primary" size="large">
          {'Next => In progress page'}
        </Button>
      </CardSection>
    </CardFlex>
  );
};
